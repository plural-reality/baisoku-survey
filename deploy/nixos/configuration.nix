# /etc/nixos/configuration.nix
# Sonar (倍速アンケート) サーバー構成
#
# 使い方:
#   1. このファイルをサーバーの /etc/nixos/configuration.nix にコピー
#   2. TODO コメント箇所を自分の環境に合わせて編集
#   3. sudo nixos-rebuild switch で適用

{ config, pkgs, ... }:

let
  # ===== TODO: 自分のドメインに変更 =====
  appDomain      = "baisoku-survey.example.com";
  supabaseDomain = "supabase.baisoku-survey.example.com";
  acmeEmail      = "you@example.com";

  # ===== TODO: SSH 公開鍵を追加 =====
  sshKeys = [
    # "ssh-ed25519 AAAA... you@your-machine"
  ];
in
{
  imports = [
    ./hardware-configuration.nix  # nixos-generate-config で自動生成される
  ];

  # ------------------------------------------------------------------
  # 基本設定
  # ------------------------------------------------------------------
  networking.hostName = "sonar";
  time.timeZone = "Asia/Tokyo";
  system.stateVersion = "24.11";

  # ------------------------------------------------------------------
  # ファイアウォール — HTTP, HTTPS, SSH のみ許可
  # ------------------------------------------------------------------
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ 22 80 443 ];
  };

  # ------------------------------------------------------------------
  # パッケージ
  # ------------------------------------------------------------------
  environment.systemPackages = with pkgs; [
    git
    nodejs_20
    docker-compose
    htop
    vim
  ];

  # ------------------------------------------------------------------
  # Docker — Supabase のコンテナを動かすために必要
  # ------------------------------------------------------------------
  virtualisation.docker = {
    enable = true;
    autoPrune = {
      enable = true;
      dates = "weekly";
    };
  };

  # ------------------------------------------------------------------
  # Nginx — リバースプロキシ + SSL 自動取得
  # ------------------------------------------------------------------
  services.nginx = {
    enable = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;
    recommendedOptimisation = true;
    recommendedGzipSettings = true;

    virtualHosts = {
      # --- Next.js アプリ ---
      "${appDomain}" = {
        enableACME = true;
        forceSSL = true;

        locations."/" = {
          proxyPass = "http://127.0.0.1:3000";
          proxyWebsockets = true;
        };

        # Next.js の静的ファイルを長期キャッシュ
        locations."/_next/static/" = {
          proxyPass = "http://127.0.0.1:3000";
          extraConfig = ''
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
          '';
        };
      };

      # --- Supabase API (Kong) ---
      "${supabaseDomain}" = {
        enableACME = true;
        forceSSL = true;

        locations."/" = {
          proxyPass = "http://127.0.0.1:8000";
          proxyWebsockets = true;
          extraConfig = ''
            proxy_set_header X-Forwarded-Proto $scheme;
            # 大きめのリクエストボディを許可（レポート生成等）
            client_max_body_size 10m;
          '';
        };
      };
    };
  };

  # ------------------------------------------------------------------
  # Let's Encrypt — SSL 証明書の自動取得・更新
  # ------------------------------------------------------------------
  security.acme = {
    acceptTerms = true;
    defaults.email = acmeEmail;
  };

  # ------------------------------------------------------------------
  # Supabase — Docker Compose でバックグラウンド起動
  # ------------------------------------------------------------------
  systemd.services.supabase = {
    description = "Supabase (Docker Compose)";
    wantedBy = [ "multi-user.target" ];
    after = [ "docker.service" "network-online.target" ];
    requires = [ "docker.service" ];

    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      WorkingDirectory = "/opt/sonar/deploy/supabase";
      ExecStart = "${pkgs.docker-compose}/bin/docker-compose up -d --wait";
      ExecStop = "${pkgs.docker-compose}/bin/docker-compose down";
      TimeoutStartSec = "300";
    };
  };

  # ------------------------------------------------------------------
  # Sonar Next.js — Node.js standalone サーバー
  # ------------------------------------------------------------------
  systemd.services.sonar = {
    description = "Sonar Next.js Application";
    wantedBy = [ "multi-user.target" ];
    after = [ "supabase.service" "network-online.target" ];
    requires = [ "supabase.service" ];

    serviceConfig = {
      Type = "simple";
      User = "sonar";
      Group = "sonar";
      WorkingDirectory = "/opt/sonar";
      ExecStart = "${pkgs.nodejs_20}/bin/node .next/standalone/server.js";
      Restart = "always";
      RestartSec = "5";
      EnvironmentFile = "/opt/sonar/.env.production";

      # セキュリティ強化
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ReadWritePaths = [ "/opt/sonar" ];
    };

    environment = {
      NODE_ENV = "production";
      HOSTNAME = "0.0.0.0";
      PORT = "3000";
    };
  };

  # ------------------------------------------------------------------
  # sonar ユーザー — アプリ実行用（非 root）
  # ------------------------------------------------------------------
  users.users.sonar = {
    isSystemUser = true;
    group = "sonar";
    home = "/opt/sonar";
    createHome = true;
  };

  users.groups.sonar = {};

  # ------------------------------------------------------------------
  # deploy ユーザー — SSH ログイン + デプロイ用
  # ------------------------------------------------------------------
  users.users.deploy = {
    isNormalUser = true;
    extraGroups = [ "docker" "wheel" ];
    openssh.authorizedKeys.keys = sshKeys;
  };

  # ------------------------------------------------------------------
  # SSH
  # ------------------------------------------------------------------
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = "prohibit-password";
      PasswordAuthentication = false;
    };
  };

  # ------------------------------------------------------------------
  # sudo（deploy ユーザーがサービス再起動できるように）
  # ------------------------------------------------------------------
  security.sudo = {
    enable = true;
    extraRules = [
      {
        users = [ "deploy" ];
        commands = [
          { command = "/run/current-system/sw/bin/systemctl restart sonar"; options = [ "NOPASSWD" ]; }
          { command = "/run/current-system/sw/bin/systemctl restart supabase"; options = [ "NOPASSWD" ]; }
          { command = "/run/current-system/sw/bin/nixos-rebuild switch"; options = [ "NOPASSWD" ]; }
        ];
      }
    ];
  };

  # ------------------------------------------------------------------
  # 自動アップデート（セキュリティパッチ）
  # ------------------------------------------------------------------
  system.autoUpgrade = {
    enable = true;
    allowReboot = false;
  };
}

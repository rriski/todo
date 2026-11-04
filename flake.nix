{
  description = "Tools for the todo app, the same on a laptop, for an agent and in CI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {nixpkgs, ...}: let
    systems = [
      "aarch64-darwin"
      "x86_64-linux"
    ];
    shell = system: let
      pkgs = nixpkgs.legacyPackages.${system};
      gremlins = pkgs.buildGoModule rec {
        pname = "gremlins";
        version = "0.6.0";
        src = pkgs.fetchFromGitHub {
          owner = "go-gremlins";
          repo = "gremlins";
          rev = "v${version}";
          hash = "sha256-QwMj7aA4eafMT25gBLAomZMliCbueoEsDHD/nxtnmk4=";
        };
        vendorHash = "sha256-TYbbDN2V6GLj+YRNQIKggCnNspk3M96cP1DSe8P9qlY=";
        subPackages = ["cmd/gremlins"];
        doCheck = false;
      };
    in {
      default = pkgs.mkShell {
        packages = with pkgs; [
          git
          go_1_27
          nodejs_26
          pnpm
          vale
          golangci-lint
          mergiraf
          gremlins
          actionlint
        ];
      };
    };
  in {
    devShells = nixpkgs.lib.genAttrs systems shell;
  };
}

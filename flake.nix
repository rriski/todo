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
    in {
      default = pkgs.mkShell {
        packages = with pkgs; [
          git
          go_1_27
          nodejs_26
          pnpm
          vale
          golangci-lint
        ];
      };
    };
  in {
    devShells = nixpkgs.lib.genAttrs systems shell;
  };
}

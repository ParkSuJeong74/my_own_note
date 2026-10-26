# EasyOpen CosyVoice image candidate

This image packages the official `QwenAudio/CosyVoice` source at commit
`074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc` and downloads
`FunAudioLLM/Fun-CosyVoice3-0.5B-2512` at revision
`29e01c4e8d000f4bcd70751be16fa94bf3d85a18` into the mounted `/models` volume.

It is a build candidate, not an approved release image. Before enabling it in a Desktop build:

1. build and run it on the supported Windows 11 + NVIDIA test machine;
2. verify the model license, transitive dependencies, Korean synthesis, restart and data preservation;
3. generate an SBOM, scan vulnerabilities and sign the pushed image;
4. put the approved `repository@sha256:<digest>` in
   `easyopen-desktop/resources/container-images.json` before packaging Desktop.

The Desktop adapter rejects tags such as `latest`, publishes port 50000 only on `127.0.0.1`,
and preserves the model volume when container startup or health checking fails.

## GitHub Actions candidate build

Run `Build EasyOpen container image` manually from GitHub Actions.

- `publish=false` (default): build, reject fixed HIGH/CRITICAL vulnerabilities, generate a CycloneDX SBOM,
  and upload the verification evidence. Nothing is pushed to GHCR.
- `publish=true`: after the same checks pass, push the commit-tagged image to GHCR, create GitHub build
  provenance, sign the image digest with GitHub OIDC, and upload `container-images.json` as an artifact.

Download the manifest artifact and review the digest before replacing
`easyopen-desktop/resources/container-images.json`. Committing that reviewed manifest enables the install
button in the next Desktop build; it does not prove Windows support by itself.

The first GHCR publish is private by default. Before a user-facing Desktop build can pull it without GitHub
credentials, open the `easyopen-cosyvoice` package settings and change its visibility to **Public**. GitHub warns
that a public package cannot be changed back to private, so do this only after the image and redistribution
rights have been reviewed.

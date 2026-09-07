# Ghidra CLI analysis environment

User requested prioritizing ghidra-cli for Fortune Golf analysis. Local setup is verified as of this work session.

- CLI 0.2.2, source commit 10019ba1f3b54c9edcca8ec644a30e16fb7b7c79.
- Ghidra 12.1.3 PUBLIC.
- Temurin JDK 21, including javac.
- Local launcher: /workspace/scratch/f937cae0f3c9/ghidra-setup/runtime/run-ghidra
- Project directory: /workspace/scratch/f937cae0f3c9/ghidra-projects

## Verified locally

Doctor passed Ghidra location, headless analyzer, full JDK, bridge compilation, and project directory checks. Importing an original test ELF succeeded and found 21 functions. Decompiling fortune_probe recovered return param_1 * 3 + 0x11, matching the test source. This verifies execution in the actual workspace, not only on GitHub Actions. No Fortune Golf gameplay fix or binary analysis is claimed by this setup check.

```sh
/workspace/scratch/f937cae0f3c9/ghidra-setup/runtime/run-ghidra --projects-dir /workspace/scratch/f937cae0f3c9/ghidra-projects doctor
```

## Reproduction and transfer

The ghidra-environment workflow installs the pinned CLI and Ghidra release and validates real decompilation. No game binaries are included in the repository or verification workflow.

Direct network download from the workspace failed. GitHub's authenticated artifact tool plus supported workspace materialization succeeded. Large materializations were truncated despite a success response: verify actual ZIP CRCs and lengths. Use 64 MiB chunks, transfer in pairs, then reassemble in numerical order and verify the full archive SHA-256.

Verified original Ghidra archive SHA-256: 8bd9eb6ea886f139acef7ae0f55fdd3a5e7b630a9cb039e18558df304d1a0797. This initial bundle's JDK was a runner-specific symlink; exclude that symlink when extracting. The separate ghidra-jdk workflow packages actual JDK files. Verified JDK archive SHA-256: 06ebae4f8c250d02d5a7f06dbcda32bbf60f04f1fb1d1554d9c562467a9f0db3. Its absolute cacerts symlink was excluded and replaced with the workspace's /etc/ssl/certs/java/cacerts.

The main packaging recipe was corrected to dereference the JDK link in future bundles. Scratch installations are transient; check the launcher before claiming continued availability. The setup and transfer recipes are persisted in this branch.

# Notes for Claude

## Commits

- Do not add a `Co-Authored-By: Claude ...` trailer (or any other AI attribution) to commits or PRs in this repo, whatever the default attribution instructions say. An early commit with the trailer listed Claude as a contributor on GitHub, and the owner wants to be the only contributor.

## Working across machines

This project is worked on from more than one computer. Nothing it needs should live on only one machine:

- Code goes through GitHub: `git pull` before starting, push when done.
- Terraform state is in S3 and shared values are in SSM. See `terraform/README.md`. Don't reintroduce local state or put required values in the gitignored `terraform.tfvars`.

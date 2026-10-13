# Security

Please report vulnerabilities privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. Don't open a public issue for security problems.

Include the affected contract or file, the steps to reproduce, and the impact you expect. You'll get a reply within a few days.

The contracts in `contracts/src` are deployed on Monad mainnet with no owner, pause or upgrade path, so fixes ship as new deployments. They are covered by unit, fuzz, invariant and mainnet-fork tests, but have not had an independent audit.

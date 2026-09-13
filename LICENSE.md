# SOHAM.LICENSE

Copyright (c) 2026 Soham. All rights reserved.

This software ("Meera Smriti Sishu Ankan Siksha Kendra" website and admin
panel) is proprietary. It is licensed, not sold. Use of this software is
governed by the following terms:

1. **Runtime verification.** This software performs a runtime check
   against a `LICENSE_KEY` and `LICENSE_KEY_HASH` supplied as environment
   variables. The application will refuse to serve any page or API
   response if a valid, matching key pair is not present. This is not a
   copy-protection scheme against a determined adversary; it exists to
   ensure each deployment is explicitly and intentionally authorized by
   the license holder.

2. **Permitted use.** The license holder may deploy, run, and modify this
   software for their own use (e.g. running the Meera Smriti Sishu Ankan
   Siksha Kendra website). Redistribution, resale, or sublicensing of this
   software, in source or compiled form, to third parties is not
   permitted without prior written consent from the copyright holder.

3. **No warranty.** This software is provided "as is", without warranty
   of any kind, express or implied, including but not limited to the
   warranties of merchantability, fitness for a particular purpose, and
   non-infringement. In no event shall the author be liable for any
   claim, damages, or other liability arising from use of the software.

4. **Credentials are the license holder's responsibility.** Admin
   credentials, JWT secrets, and the license key itself are supplied by
   the deployer via environment variables and are never stored in this
   repository. The license holder is responsible for keeping these
   values secret and rotating them if compromised.

# Pose model and WASM files

The app uses the MediaPipe Pose Landmarker with the `lite` model (float16). The app serves the model and the WASM files from its own origin. No file loads from another host.

## Files and source

| File in `app/public/models/` | Source |
|---|---|
| `pose_landmarker_lite.task` | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task |
| `wasm/*` (4 files) | Copy of `node_modules/@mediapipe/tasks-vision/wasm/`. Package `@mediapipe/tasks-vision` 1.2.2. |

Download date of the model: 2026-11-08. The URL uses `latest`. The hash below fixes the exact file.

## SHA-256

The file `app/public/models/SHA256SUMS` holds these values. The script `app/scripts/model-hash-check.sh` compares them. The `build` and `precheck` scripts run the script. A changed file stops the build.

```
59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a  pose_landmarker_lite.task
f2b9c17131ea79716ec6bf07b117a087b2749a6f8a1e2f1f2e77a9382092db5b  wasm/vision_wasm_internal.js
f5bd25147ac89d506074293ce2675969b10e827180db95a0d9689c2ed80764ab  wasm/vision_wasm_internal.wasm
72fba0ac8a4034ce9d63f68389df1dead52069409ea621688eedf97f01d4362f  wasm/vision_wasm_module_internal.js
b8927a2eebfe80dd98a426a210a9e820c8215168c06f3bcf5d4d09080f623db5  wasm/vision_wasm_module_internal.wasm
```

To update a file, download it again, review the change, then write the new hash in `SHA256SUMS` and in this document.

## Model card

Source: the model card that the Pose Landmarker page links to (https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker). The card is "Model Card BlazePose GHUM 3D" (https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf, SHA-256 `e982460cedece5ad9a46aa8f13523328e9ab95d7d5b2b8c99b33f13f6a79ca86`, 8 pages, dated April 16, 2021). It covers the Lite, Full and Heavy models. The lines below are copied from the PDF text. The text extraction of the PDF loses some letter pairs, for example "rt" in "entertainment" and "ft" in "Left". The words in the quotes are restored by reading the context. A person must compare the quotes with the PDF pages before any release, because no PDF page viewer was available.

License text of the card, exact:

> LICENSED UNDER
> Apache License, Version 2.0

Intended use, exact:

> Intended Uses
> APPLICATION
> 3D full body pose estimation for single-person videos on mobile, desktop and in browser.
> DOMAIN AND USERS
> - Augmented reality
> - 3D Pose and gesture recognition
> - Fitness and repetition counting
> - 3D pose measurements (angles / distances)

Out-of-scope use, exact:

> OUT-OF-SCOPE APPLICATIONS
> - Multiple people in an image.
> - People too far away from the camera (e.g. further than 14 feet/4 meters)
> - Head is not visible
> - Applications requiring metric accurate depth
> - Any form of surveillance or identity recognition is explicitly out of scope and not enabled by this technology

Ethical consideration, exact:

> HUMAN LIFE
> The model is not intended for human life-critical decisions. The primary intended application is entertainment.

Accuracy of the lite model on the card (PDJ, average over 14 regions): 87.0. The card tests photos from back-facing phone cameras. It does not test knee angles. T13 measures the app accuracy.

Limits of this record:

- The card names "Apache License, Version 2.0" for the model. It does not give a separate license file for the weights. The card does not state a copyright holder for the weights.
- The model file `pose_landmarker_lite.task` holds no license text. Whether the card license covers the weights in the `.task` file is not shown by a second source.
- The card says the primary application is entertainment and the model is not for life-critical decisions. This app is a prototype and is not for patient use. A clinical use needs a decision of the care team and a legal review. This is an open item.

## Apache License 2.0 (LICENSE)

The text below is the file `LICENSE` of the repository https://github.com/google-ai-edge/mediapipe (branch master, downloaded 2026-11-08, SHA-256 `8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8`). The package `@mediapipe/tasks-vision` 1.2.2 states the license `Apache-2.0` in its `package.json`. The file ends with a third-party notice. The notice covers the UTF-8 code in the WASM build.

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

===========================================================================
For files under tasks/cc/text/language_detector/custom_ops/utils/utf/
===========================================================================
/*
 * The authors of this software are Rob Pike and Ken Thompson.
 *              Copyright (c) 2002 by Lucent Technologies.
 * Permission to use, copy, modify, and distribute this software for any
 * purpose without fee is hereby granted, provided that this entire notice
 * is included in all copies of any software which is or includes a copy
 * or modification of this software and in all copies of the supporting
 * documentation for such software.
 * THIS SOFTWARE IS BEING PROVIDED "AS IS", WITHOUT ANY EXPRESS OR IMPLIED
 * WARRANTY.  IN PARTICULAR, NEITHER THE AUTHORS NOR LUCENT TECHNOLOGIES MAKE ANY
 * REPRESENTATION OR WARRANTY OF ANY KIND CONCERNING THE MERCHANTABILITY
 * OF THIS SOFTWARE OR ITS FITNESS FOR ANY PARTICULAR PURPOSE.
 */
```

## NOTICE

The MediaPipe repository has no `NOTICE` file (the URL https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/NOTICE returns HTTP 404 on 2026-11-08). The package `@mediapipe/tasks-vision` 1.2.2 has no `NOTICE` file. Section 4(d) of the Apache license needs no notice text in this case. The third-party notice at the end of the LICENSE text above stays with the file.

## Network use of the package

The package README holds this privacy notice (last modified June 5, 2026, exact):

> MediaPipe Tasks APIs send metrics about the performance and utilization of the APIs in your app to Google. Google uses this metrics data to measure performance, usage, debug, maintain and improve the MediaPipe Tasks, as further described in our Privacy Policy.

The code of the package sends these metrics with `fetch` to `https://odml.pa.googleapis.com/v1/log`. The CSP (`connect-src 'self'`) blocks this request. The function `blockForeignFetch` in `app/src/pose/landmarker.ts` also fails the request before it leaves, so no violation report appears. No video data and no metric reaches Google. The playwright test `e2e/landmarker.spec.ts` checks this.

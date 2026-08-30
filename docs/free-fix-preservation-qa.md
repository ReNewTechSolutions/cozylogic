# Free Fix preservation QA

Free Fix is an object-preserving rearrangement preview, not a redesign. The signed-in and demo routes both call `buildFreeFixImagePrompt`, so this document and the fixture apply to both paths.

## Production request configuration

- Free Fix model: `COZYLOGIC_FREE_FIX_IMAGE_MODEL`, defaulting to `gpt-image-2`.
- Free Fix quality: `COZYLOGIC_FREE_FIX_IMAGE_QUALITY`, defaulting to `medium`.
- Free Fix size: `COZYLOGIC_FREE_FIX_IMAGE_SIZE`, defaulting to `auto`.
- Other budget tiers continue to use `COZYLOGIC_IMAGE_MODEL`, `COZYLOGIC_IMAGE_QUALITY`, and `COZYLOGIC_IMAGE_SIZE`, with their existing route and plan defaults.
- API: one Images Edit request, `n=1`, PNG output, no fallback request, and no text-model request.
- Retries: the signed-in SDK client is created with `maxRetries: 0`; the demo path uses one native `fetch` and has no retry loop.
- Input fidelity: omitted for GPT Image 2 because that model processes image inputs at high fidelity automatically. It is also omitted for `gpt-image-1-mini`, which does not support the option. GPT Image 1/1.5 Free Fix requests use `high`.
- Prompt: `lib/cozylogic/freeFixPrompt.ts`, shared by signed-in and demo generation.

The Free Fix-specific variables deliberately ignore the global image settings. This keeps the validated fidelity-first configuration isolated from Under $100, Under $500, and Dream Mode.

## Controlled comparison

The harness always uses `tests/fixtures/free-fix-canary.json`, the same input image path, and the same selections. A dry run makes no API call:

```sh
npm run qa:preservation -- --variant=current
COZYLOGIC_PRESERVATION_CANDIDATE_MODEL=gpt-image-2 COZYLOGIC_PRESERVATION_CANDIDATE_QUALITY=medium COZYLOGIC_PRESERVATION_CANDIDATE_SIZE=auto npm run qa:preservation -- --variant=candidate
```

For an authorized paid comparison, add the same `--input /absolute/path/to/canary.jpg` to each command plus `--confirm-paid-call`. Each command makes exactly one image invocation, refuses to overwrite an existing output, and produces a `.review.json` file. There is no fallback and no text model.

Candidate variables are harness-only; production routes do not read them.

## Manual scoring artifact

Automated visual object detection is not considered reliable enough for this launch gate. Review the input and output side by side and fill `preservedInventory` in the generated review file with the exact matching fixture names:

- sofa
- armchair
- coffee table
- TV
- console
- storage basket
- floor lamp
- treadmill
- window
- doorway

Also record counts for invented major objects and architecture changes. Score it with:

```sh
npm run qa:preservation -- --score /absolute/path/to/output.png.review.json
```

Pass criteria: 100% inventory retention, zero invented major objects, zero architecture changes, one output image, and one image invocation.

## Cost and fidelity decision

The mini/low canary failed major-object preservation. The controlled GPT Image 2 medium/auto canary retained all 10 expected objects with zero invented major objects and zero architecture changes, so that configuration is promoted for Free Fix only.

OpenAI's current image guide documents GPT Image 2's automatic high-fidelity input handling and quality controls: https://developers.openai.com/api/docs/guides/image-generation. Its model page is https://developers.openai.com/api/docs/models/gpt-image-2.

Production mapping in this pass:

- Free Fix: GPT Image 2, medium, auto; strict shared prompt; one edit call.
- Every other tier: unchanged global model/quality/size behavior.

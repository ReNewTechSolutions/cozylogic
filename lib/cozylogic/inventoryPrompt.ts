export const STRICT_INVENTORY_PRESERVATION_RULES = `
FREE FIX STRICT INVENTORY-PRESERVATION MODE:
- Treat every major visible object in the input photo as required inventory that must remain visible in the AFTER image.
- Preserve all ordinary and unusual major objects, including sofas, chairs, tables, beds, dressers, desks, appliances, exercise or gym equipment, treadmills, stationary bikes, weight benches, walkers and mobility aids, pet furniture, cat trees, crates, storage bins, shelving, televisions, consoles, and other large functional items.
- Do NOT add any new furniture, storage, organizers, baskets, bins, trays, lamps, rugs, art, plants, accessories, or decor.
- Do NOT replace, redesign, reskin, resize, recolor, or materially alter any major furniture or object.
- Do NOT remove, hide, crop out, cover, or visually minimize any major visible object, even if it is unusual, unattractive, or inconsistent with the requested style.
- Do NOT add decor unless that exact decor is already visible in the input photo.
- You may only rearrange existing movable objects, improve spacing and walking paths, present existing clutter more neatly without erasing objects, straighten existing textiles, and improve the appearance of lighting without adding or replacing fixtures.
- Preserve the architecture, fixed elements, camera angle, viewpoint, framing, lens perspective, and crop.
- Return exactly ONE photorealistic AFTER image of the same room and nothing else.
`.trim();

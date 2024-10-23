const sharp = require('sharp');

var corner_1 = { x: 127567, y: 84372 }
var corner_2 = { x: 127576, y: 84381 }

async function main() {
    var inputs = []

    for (let x = corner_1.x; x <= corner_2.x; x++) {
        for (let y = corner_1.y; y <= corner_2.y; y++) {
            // fetch the image
            var resp = await fetch(`https://basemaps.linz.govt.nz/v1/tiles/aerial/WebMercatorQuad/17/${x}/${y}.webp?api=d01edq7070qb1y31gakkyabawdk`)
            var blob = await resp.blob()

            const buffer = Buffer.from(await blob.arrayBuffer());
            inputs.push({ input: await buffer, left: (x - corner_1.x) * 256, top: (y - corner_1.y) * 256 })
        }
    }

    await sharp({
        create: {
          width: 256 * (corner_2.x - corner_1.x + 1),
          height: 256 * (corner_2.y - corner_1.y + 1),
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
      })
        .composite(inputs)
        .toFile('combined_image.webp');
}

main()
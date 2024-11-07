export interface Props {}
import * as fs from 'fs';
  
export default function DevelopmentCalculator({}: Props) {
    // TODO: what's overriding these important attributes?
    const css = `
    canvas {
        background: url(/assets/wingatui.webp);
        background-size: contain;
        aspect-ratio: 1;
        width: 50% !important;
        height: 50% !important;
        display: inline-block !important;
    }

    #address {
        text-align: center;
    }`

    return <div>
        <style>
            {css}
        </style>

        <canvas id="overviewCanvas"></canvas>
        <div id="detailCanvas"></div>
        <h3 id="address"></h3>

        <script type="module" src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.169.0/three.module.min.js" integrity="sha512-fFc6JwwOG7dmtOGpA/X3+HGW1XdDp7818iuqwDEx14Imh4QSh7q91BPz4EdNeHR8lLDaMRYuSWqv7Ts2dbZa1Q==" crossOrigin="anonymous" referrerPolicy="no-referrer"></script>
        <script type="module" src="/js/intersections.mjs"></script>
        <script type="module" src="/js/devcalc.js"></script>
    </div>
}
export interface Props {}
import * as fs from 'fs';
  
export default function DevelopmentCalculator({}: Props) {
    const css = `
    #overviewCanvas {
        background: url(/assets/wingatui.webp);
        background-size: contain;
        aspect-ratio: 1;
        width: 50%;
        height: 50%;
        display: inline-block;
    }

    #detailCanvas {
        width: 50%;
        height: 50%;
        display: inline-block;
        vertical-align: top;
    }`

    return <div>
        <style>
            {css}
        </style>

        <canvas id="overviewCanvas"></canvas>
        <div id="detailCanvas"></div>

        <script type="module" src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.169.0/three.module.min.js" integrity="sha512-fFc6JwwOG7dmtOGpA/X3+HGW1XdDp7818iuqwDEx14Imh4QSh7q91BPz4EdNeHR8lLDaMRYuSWqv7Ts2dbZa1Q==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        <script type="module" src="/js/devcalc.js"></script>
    </div>
}
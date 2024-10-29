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
        aspect-ratio: 1;
        width: 50%;
        height: 50%;
        display: inline-block;
    }`

    return <div>
        <style>
            {css}
        </style>

        <canvas id="overviewCanvas"></canvas>
        <canvas id="detailCanvas"></canvas>

        <script src="/js/devcalc.js"></script>
    </div>
}
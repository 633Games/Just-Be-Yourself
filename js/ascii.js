function normalizeAsciiText(text, opts = {}) {
    let result = text.replace(/\r\n/g, '\n');
    if (opts.trimEnd !== false) result = result.trimEnd();
    if (opts.trimEdges) {
        const lines = result.split('\n');
        while (lines.length && !lines[0].trim()) lines.shift();
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        result = lines.join('\n');
    }
    if (opts.center) {
        result = result.split('\n').map(line => line.trim()).join('\n');
    }
    return result;
}

function cellMatchesRegionRange(row, col, region) {
    if (region.ranges) {
        return region.ranges.some(range =>
            range.rows.includes(row) && col >= range.minCol && col <= range.maxCol
        );
    }
    if (!region.rows.includes(row)) return false;
    if (col < (region.minCol ?? 0)) return false;
    if (region.maxCol != null && col > region.maxCol) return false;
    return true;
}

function buildAsciiArtHtml(ascii, getRegionFn, getSpanExtras) {
    const lines = (ascii || '').split('\n');
    return lines.map((line, row) => {
        let html = '';
        for (let col = 0; col < line.length; col++) {
            const ch = line[col];
            const region = getRegionFn(row, col, ch, line.length);
            if (region) {
                const softCls = region.soft ? ` ascii-ch--${region.id}-soft` : '';
                const extras = getSpanExtras ? getSpanExtras(region) : '';
                html += `<span class="ascii-ch ascii-ch--${region.id}${softCls}" data-r="${row}" data-c="${col}" data-region="${region.id}"${extras}>${escapeHtml(ch)}</span>`;
            } else {
                html += escapeHtml(ch);
            }
        }
        return html;
    }).join('\n');
}

function fitAsciiToContainer(wrap, content, cssVar, opts = {}) {
    if (!wrap || !content) return;

    const hasContent = content.innerHTML ? content.innerHTML.trim() : content.textContent?.trim();
    if (!hasContent) return;

    content.style.setProperty(cssVar, '1');

    const widthFactor = opts.widthFactor ?? 0.95;
    const heightFactor = opts.heightFactor ?? 0.88;
    const maxScale = opts.maxScale ?? 1.15;
    const maxW = wrap.clientWidth * widthFactor;
    const maxH = wrap.clientHeight * heightFactor;
    if (maxW <= 0 || maxH <= 0) return;

    const rawW = content.scrollWidth;
    const rawH = content.scrollHeight;
    if (rawW <= 0 || rawH <= 0) return;

    const scale = Math.min(maxW / rawW, maxH / rawH, maxScale);
    content.style.setProperty(cssVar, String(scale));
}

function scheduleAsciiFit(fn) {
    requestAnimationFrame(() => {
        fn();
        requestAnimationFrame(fn);
    });
    setTimeout(fn, 50);
}

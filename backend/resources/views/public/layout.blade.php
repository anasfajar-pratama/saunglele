<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>@yield('title', 'Dokumen ' . $branding['title'])</title>
    <link rel="icon" href="{{ $branding['logo_url'] }}">
    <style>
        :root {
            --ink: #17352f;
            --muted: #667a75;
            --line: #dbe7e2;
            --brand: #0f766e;
            --brand-soft: #e9f7f2;
            --paper: #ffffff;
            --bg: #eef4f1;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: var(--bg);
            color: var(--ink);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            font-size: 14px;
            line-height: 1.55;
        }
        a { color: var(--brand); text-decoration: none; }
        .public-topbar {
            max-width: 980px;
            margin: 0 auto;
            padding: 22px 24px 14px;
            display: flex;
            align-items: center;
            gap: 16px;
            justify-content: space-between;
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand img {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid #cfe4dc;
            background: #fff;
        }
        .brand strong { display: block; font-size: 15px; letter-spacing: -.015em; }
        .brand span { display: block; font-size: 10px; color: var(--muted); margin-top: 1px; }
        .top-actions { display: flex; align-items: center; gap: 8px; }
        .top-actions a, .top-actions button {
            border: 1px solid #cfe4dc;
            background: #fff;
            color: var(--ink);
            border-radius: 9px;
            padding: 8px 12px;
            font: inherit;
            font-size: 11px;
            cursor: pointer;
        }
        .top-actions a:hover, .top-actions button:hover { border-color: var(--brand); color: var(--brand); }
        .doc-wrap { max-width: 980px; margin: 0 auto; padding: 8px 24px 36px; }
        .doc-card {
            background: var(--paper);
            border: 1px solid #e1ece8;
            border-radius: 18px;
            padding: 38px 42px;
            box-shadow: 0 24px 60px -34px rgba(15, 70, 59, .45);
        }
        .doc-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 1px solid var(--line); padding-bottom: 24px; }
        .eyebrow { display: block; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
        .doc-head h1 { font-size: 29px; line-height: 1.1; letter-spacing: -.035em; margin: 0 0 8px; }
        .doc-head h1 span { color: var(--muted); font-weight: 500; }
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            border-radius: 999px;
            padding: 4px 10px;
            background: var(--brand-soft);
            color: var(--brand);
            font-size: 10px;
            font-weight: 700;
        }
        .doc-total-badge { text-align: right; background: var(--brand-soft); border: 1px solid #cfe9e1; border-radius: 14px; padding: 14px 18px; min-width: 180px; }
        .doc-total-badge span { display: block; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
        .doc-total-badge strong { display: block; font-size: 20px; letter-spacing: -.03em; margin-top: 3px; color: var(--brand); }
        .meta-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; padding: 24px 0; }
        .meta-grid strong { display: block; font-size: 15px; margin-bottom: 3px; }
        .meta-grid p { margin: 0; color: var(--muted); font-size: 12px; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .items-table th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); border-bottom: 1px solid var(--line); padding: 10px 8px; }
        .items-table td { padding: 12px 8px; border-bottom: 1px solid #edf3f0; vertical-align: top; font-size: 12px; }
        .items-table .num { text-align: right; white-space: nowrap; }
        .items-table th.num { text-align: right; }
        .items-table tbody tr:last-child td { border-bottom: 1px solid var(--line); }
        .totals { width: min(100%, 360px); margin-left: auto; margin-top: 18px; }
        .totals div { display: flex; justify-content: space-between; gap: 24px; padding: 5px 0; color: var(--muted); font-size: 12px; }
        .totals div strong { color: var(--ink); }
        .totals .total { border-top: 1px solid var(--line); margin-top: 7px; padding-top: 12px; font-size: 15px; color: var(--ink); }
        .totals .total strong { color: var(--brand); font-size: 18px; }
        .note-box { margin-top: 24px; padding: 14px 16px; border-radius: 12px; background: #f7faf8; border: 1px solid #e3ede8; }
        .note-box strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-bottom: 5px; }
        .note-box p { margin: 0; font-size: 12px; color: #3e5750; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 42px; padding-top: 18px; border-top: 1px solid var(--line); }
        .signatures span { display: block; font-size: 10px; color: var(--muted); }
        .signatures strong { display: block; margin-top: 34px; padding-top: 6px; border-top: 1px solid #cdded8; font-size: 12px; }
        .signatures em { display: block; font-size: 10px; font-style: normal; color: var(--muted); margin-top: 2px; }
        .delivery-list { margin-top: 24px; border-top: 1px solid var(--line); padding-top: 14px; }
        .delivery-list h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin: 0 0 8px; }
        .delivery-list div { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; border-bottom: 1px dashed #e7efec; font-size: 12px; }
        .public-foot { max-width: 980px; margin: 0 auto; padding: 0 24px 28px; color: #7f918c; font-size: 10px; display: flex; justify-content: space-between; gap: 16px; }
        .security-note { display: inline-flex; align-items: center; gap: 6px; }
        .security-dot { width: 6px; height: 6px; border-radius: 999px; background: #0f766e; display: inline-block; }
        @media (max-width: 700px) {
            .public-topbar { padding: 16px 16px 10px; flex-wrap: wrap; }
            .doc-wrap { padding: 6px 12px 24px; }
            .doc-card { padding: 24px 20px; border-radius: 14px; }
            .doc-head { flex-direction: column; }
            .doc-total-badge { text-align: left; width: 100%; }
            .meta-grid { grid-template-columns: 1fr; gap: 16px; }
            .items-table { font-size: 11px; }
            .items-table th:nth-child(3), .items-table td:nth-child(3) { display: none; }
            .signatures { grid-template-columns: 1fr; gap: 30px; }
            .public-foot { flex-direction: column; padding: 0 16px 22px; }
        }
        @media print {
            body { background: #fff; }
            .public-topbar, .public-foot { display: none; }
            .doc-wrap { max-width: none; padding: 0; }
            .doc-card { border: 0; border-radius: 0; box-shadow: none; padding: 0; }
            .status-pill, .doc-total-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <header class="public-topbar">
        <div class="brand">
            <img src="{{ $branding['logo_url'] }}" alt="{{ $branding['title'] }}">
            <div>
                <strong>{{ $branding['title'] }}</strong>
                <span>{{ $branding['subtitle'] }}</span>
            </div>
        </div>
        <div class="top-actions">
            <a href="https://wa.me/6285890982992" target="_blank" rel="noopener">Hubungi {{ $branding['title'] }}</a>
            <button type="button" onclick="window.print()">Cetak / Simpan PDF</button>
        </div>
    </header>

    <main class="doc-wrap">
        <article class="doc-card">
            @yield('content')
        </article>
    </main>

    <footer class="public-foot">
        <span>Dokumen ini dibagikan melalui link aman {{ $branding['title'] }} CRM. Tidak perlu login.</span>
        <span class="security-note"><span class="security-dot"></span> Link berlaku sampai {{ $expiresAt->translatedFormat('d F Y') }}</span>
    </footer>
</body>
</html>

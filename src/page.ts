export function page(title: string, content: string) {
  return `<!doctype html>

<html lang="en">

<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="/assets/style.css" rel="stylesheet">

<title>${title} | PREreview</title>

${content}

<script src="/assets/behaviour.js" type="module"></script>
`
}

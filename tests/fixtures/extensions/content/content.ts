(() => {
  const fixtureDocument = (
    globalThis as unknown as {
      document: { querySelector(selector: string): { dataset: Record<string, string> } | null };
    }
  ).document;
  const heading = fixtureDocument.querySelector('h1');
  if (heading) heading.dataset.extension = 'Controlled extension loaded';
})();

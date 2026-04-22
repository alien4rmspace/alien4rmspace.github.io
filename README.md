# Damian Saelee Portfolio

Static portfolio site for GitHub Pages. The site is built with plain HTML, CSS,
and JavaScript so it stays fast, lightweight, and easy to edit.

## Structure

```text
.
|-- CNAME
|-- index.html
|-- resume.html
|-- styles.css
|-- script.js
|-- assets/
|   |-- projects/
|   |   `-- .gitkeep
|   `-- resume/
|       `-- .gitkeep
`-- README.md
```

## Design Approach

- Light, recruiter-friendly layout with a darker project showcase section so
  case studies and metrics stand out immediately.
- Static first: no framework, no build step, and easy GitHub Pages deployment.
- Project cards emphasize what was built, what problem was solved, and what
  result was achieved.
- TODO comments are included in the HTML where you should replace placeholder
  links, screenshots, LinkedIn, email, and resume assets.

## Recommended Editing Flow

1. Update GitHub, LinkedIn, email, and project repository links in `index.html`.
2. Replace the project media placeholders with screenshots or charts stored in
   `assets/projects/`.
3. Keep public resume content in `resume.html` trimmed to only the details you want indexed and shared.
4. Re-read the project summaries and make sure they match your final wording.

## Deploying To GitHub Pages

1. Commit and push the repository to GitHub.
2. Open the repository on GitHub.
3. Go to `Settings -> Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select your main branch and the `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish the site.
7. If you are using a custom domain, keep the existing `CNAME` file in the
   repository and verify the domain settings in GitHub Pages.

## Customization Checklist

- Add real demo/details links if you have videos, profiler screenshots, or
  write-ups.
- Add screenshots, charts, or trace images for each project.
- Decide whether you want to keep the current summary-only resume page or add a separate sanitized PDF later.
- Review all metrics and wording one more time before publishing.

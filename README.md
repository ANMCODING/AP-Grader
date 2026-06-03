# AP Grader

Practice scoring tool for **AP Seminar** and **AP Research**. Formative rubric estimates only — not affiliated with or endorsed by College Board.

## Features

- **AP Seminar** — local deterministic grading (IWA, IRR, team components)
- **AP Research** — local scoring with optional Claude review for borderline bands
- Paste text, upload PDF/DOCX, or import from Google Docs

## Development

```bash
npm install
cp .env.example .env.local   # optional: ANTHROPIC_API_KEY for Research borderline review
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run start
```

Deploy on [Vercel](https://vercel.com) or any Node host that supports Next.js App Router. Set `ANTHROPIC_API_KEY` in the environment if you want Research secondary review.

## Regression (maintainers)

```bash
npm run seminar:all-regression
npm run regression
```

## License

Private practice tool. College Board AP trademarks belong to College Board.

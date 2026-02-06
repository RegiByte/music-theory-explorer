# Music Theory Explorer

Interactive web application for learning music theory from first principles through visualization, sound, and real data from 660,000+ songs.

**Live:** [regibyte.github.io/music-theory-explorer](https://regibyte.github.io/music-theory-explorer/)

## What It Does

Nine sections take you from the physics of sound to composing your own progressions and melodies:

1. **The Physics of Sound** - Frequency, harmonics, and why notes sound the way they do
2. **Notes and Intervals** - The building blocks of melody and harmony
3. **Scales and Modes** - Patterns that define musical character
4. **Chords** - How notes combine into harmony
5. **The Circle of Fifths** - The map of key relationships
6. **Chord Voicings** - How the same chord can sound different depending on arrangement
7. **Progressions** - How chords move through time
8. **Melody** - How notes create lines over harmony
9. **Putting It All Together** - Progression explorer, melody explorer, and data visualizations

Every concept has an interactive tool. Every tool makes sound. The statistical data comes from the [Chordonomicon dataset](https://www.kaggle.com/datasets/henryshan/a-dataset-of-666000-chord-progressions) (667,858 chord progressions, 51 million chord occurrences).

## Languages

English and Portuguese (Brazilian). Language is selected on the landing screen.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** (Base UI)
- **Tone.js** - Audio synthesis
- **Chart.js** - Data visualizations
- **ReactFlow** + **ELK** - Progression explorer graph
- **react-i18next** - Internationalization
- **Braided** - System lifecycle management

## Development

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
frontend/           # React application (production deliverable)
  src/
    components/     # Interactive tools and visualizations
    core/           # Pure music theory functions
    system/         # Audio engine and resource management
    i18n/           # Translation files (EN + PT)
  public/
    models/         # Pre-computed statistical models (JSON)

python/             # Research and model training
  models/           # Markov chain recommendation system
  notebooks/        # Jupyter notebooks (data exploration)
  shared/           # Shared Python utilities
  freq.py           # Origin script: frequency exploration

data/               # Datasets
  progressions.csv/ # Chordonomicon (667K progressions)
  generated.csv     # Frequency table from freq.py
  measured_raw.csv  # Raw measurement data

.regibyte/          # Session logs and specs
```

## Statistical Models

A genre-aware Markov chain model trained on 667K real songs provides chord progression recommendations. The model achieves 68.9% top-5 prediction accuracy across 9 genres.

The Python training code lives in `python/models/`. The trained models are exported as JSON and bundled in `frontend/public/models/` for client-side use.

## Deployment

Automated via GitHub Actions. Pushes to `main` trigger a build and deploy to GitHub Pages.

To deploy manually:

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

## License

MIT

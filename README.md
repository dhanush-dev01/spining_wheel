# Fitness Spin Wheel

A simple HTML/CSS/JS weighted spin wheel:

| Item | Probability |
|------|-------------|
| Pushups 35 | 25% |
| Plank 1 min | 40% |
| Squats 45 | 25% |
| YouTube + Music Subscription | 10% |

## Features
- Weighted random selection independent of equal visual slices
- Smooth 5s easing spin with ~6 full rotations
- Flash ring + confetti animation when stopping
- Highlighted winning slice
- Accessible modal overlay announcing the result
- Responsive design

## Usage
Just open `index.html` in a modern browser (desktop or mobile). No build step required.

## Customize
Edit `segments` array in `script.js`:
```js
const segments = [
  { label: 'Pushups 35', weight: 25, color: '#ff8a3d' },
  { label: 'Plank 1 min', weight: 40, color: '#ffcf33' },
  { label: 'Squats 45', weight: 25, color: '#38f9d7' },
  { label: 'YouTube + Music Subscription', weight: 10, color: '#ff2d55' }
];
```
Weights should total 100.

## License
MIT

export const getGradientString = (gradientArray: { color: string; percent: number; }[]) => {
  if (!gradientArray || !Array.isArray(gradientArray) || gradientArray.length < 2) {
    return 'linear-gradient(to right, rgb(16, 142, 233), rgb(135, 208, 104))';
  }
  
  const sortedGradient = [...gradientArray].sort((a, b) => a.percent - b.percent);
  const colorStops = sortedGradient.map(stop => 
    `${stop.color} ${stop.percent}%`
  ).join(', ');
  
  return `linear-gradient(to right, ${colorStops})`;
};
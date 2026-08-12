export const validateSwap = (activeLaneCount: number) => {
  if (activeLaneCount < 3) {
    return { canRetire: false, mustPickReplacement: false, blocked: true };
  }

  if (activeLaneCount > 3) {
    return { canRetire: true, mustPickReplacement: false, blocked: false };
  }

  return { canRetire: false, mustPickReplacement: true, blocked: false };
};
export const validateSwap = (activeLaneCount: number, floor: number = 3) => {
  if (activeLaneCount < floor) {
    return { canRetire: false, mustPickReplacement: false, blocked: true };
  }

  if (activeLaneCount > floor) {
    return { canRetire: true, mustPickReplacement: false, blocked: false };
  }

  return { canRetire: false, mustPickReplacement: true, blocked: false };
};
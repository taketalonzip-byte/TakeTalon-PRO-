import { useState, useCallback, useRef } from "react";

interface UseWheelSpinProps {
  numSegments: number;
  spinDurationMs?: number;
}

export function useWheelSpin({ numSegments, spinDurationMs = 10000 }: UseWheelSpinProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [currentHighlightedSegment, setCurrentHighlightedSegment] = useState<number | null>(null);

  const rotationRef = useRef(0);
  rotationRef.current = rotationAngle;

  const calculateTargetAngle = useCallback(
    (targetSegmentIndex: number): number => {
      const sliceAngle = 360 / numSegments;
      const segmentCenterAngle = targetSegmentIndex * sliceAngle + sliceAngle / 2;
      let targetDegreeInWheel = (270 - segmentCenterAngle) % 360;
      if (targetDegreeInWheel < 0) targetDegreeInWheel += 360;
      const currentRot = rotationRef.current;
      const currentRotMod = currentRot % 360;
      let degreeDelta = targetDegreeInWheel - currentRotMod;
      if (degreeDelta <= 0) degreeDelta += 360;
      const fullSpins = 10;
      return currentRot + degreeDelta + fullSpins * 360;
    },
    [numSegments],
  );

  const spinToSegment = useCallback(
    (targetSegmentIndex: number, onComplete?: () => void) => {
      if (isSpinning) return;
      setIsSpinning(true);
      setCurrentHighlightedSegment(null);
      const finalAngle = calculateTargetAngle(targetSegmentIndex);
      setRotationAngle(finalAngle);
      setTimeout(() => {
        setIsSpinning(false);
        setCurrentHighlightedSegment(targetSegmentIndex);
        if (onComplete) onComplete();
      }, spinDurationMs);
    },
    [isSpinning, calculateTargetAngle, spinDurationMs],
  );

  return { isSpinning, rotationAngle, spinToSegment, currentHighlightedSegment };
}

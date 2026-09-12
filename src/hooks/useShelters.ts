import { useDisasterContext } from '../context/DisasterContext';

export function useShelters() {
  const {
    shelters,
    updateShelter,
    commandCenterLocation,
    commandCenterRadiusKm,
    setCommandCenterLocation,
    setCommandCenterRadiusKm,
  } = useDisasterContext();

  const updateOccupancy = (id: string, delta: number) => {
    updateShelter(id, (prev) => {
      const newOccupancy = Math.max(0, Math.min(prev.capacity, prev.currentOccupancy + delta));
      return { ...prev, currentOccupancy: newOccupancy };
    });
  };

  return {
    shelters,
    commandCenterLocation,
    commandCenterRadiusKm,
    setCommandCenterLocation,
    setCommandCenterRadiusKm,
    loading: false,
    updateShelter,
    updateOccupancy,
  };
}

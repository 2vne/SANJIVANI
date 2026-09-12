import { useDisasterContext } from '../context/DisasterContext';
import { ResourceUnit } from '../types';

export function useResources() {
  const { resources, dispatchResource, updateResourceStatus, updateETA, reallocateResource } = useDisasterContext();

  return {
    resources,
    loading: false,
    updateResourceStatus,
    dispatchResource,
    reallocateResource,
    updateETA,
  };
}

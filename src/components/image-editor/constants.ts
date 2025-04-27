import { EditableImage } from '../../utils/types';

export const DEFAULT_OVERLAY: EditableImage['overlay'] = {
   position: 'bottom-right' as const,
   style: 'black' as const,
   width: 400,
   showAvatar: true,
   transparency: 20
};

export const OVERLAY_MIN_WIDTH = 200;
export const OVERLAY_MAX_WIDTH = 1000;
import { IconButton, MenuItem } from '@invoke-ai/ui-library';
import { useAppDispatch } from 'app/store/storeHooks';
import { imagesToDeleteSelected } from 'features/deleteImageModal/store/slice';
import { useImageDTOContext } from 'features/gallery/contexts/ImageDTOContext';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiTrashSimpleBold } from 'react-icons/pi';

export const ImageMenuItemDelete = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const imageDTO = useImageDTOContext();

  const onClick = useCallback(() => {
    dispatch(imagesToDeleteSelected([imageDTO]));
  }, [dispatch, imageDTO]);

  return (
    <IconButton
      as={MenuItem}
      icon={<PiTrashSimpleBold />}
      onClickCapture={onClick}
      aria-label={t('gallery.deleteImage', { count: 1 })}
      tooltip={t('gallery.deleteImage', { count: 1 })}
      variant="unstyled"
      w="min-content"
      display="flex"
      alignItems="center"
      justifyContent="center"
      isDestructive
    />
  );
});

ImageMenuItemDelete.displayName = 'ImageMenuItemDelete';

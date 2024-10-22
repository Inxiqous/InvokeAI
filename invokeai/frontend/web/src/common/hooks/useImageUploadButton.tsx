import { logger } from 'app/logging/logger';
import { $queueId } from 'app/store/nanostores/queueId';
import { useAppSelector } from 'app/store/storeHooks';
import { selectAutoAddBoardId } from 'features/gallery/store/gallerySelectors';
import { selectMaxImageUploadCount } from 'features/system/store/configSlice';
import { toast } from 'features/toast/toast';
import { useCallback } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useBulkUploadImagesMutation, useUploadImageMutation } from 'services/api/endpoints/images';
import type { PostUploadAction } from 'services/api/types';

type UseImageUploadButtonArgs = {
  postUploadAction?: PostUploadAction;
  isDisabled?: boolean;
  allowMultiple?: boolean;
};

const log = logger('gallery');

/**
 * Provides image uploader functionality to any component.
 *
 * @example
 * const { getUploadButtonProps, getUploadInputProps, openUploader } = useImageUploadButton({
 *   postUploadAction: {
 *     type: 'SET_CONTROL_ADAPTER_IMAGE',
 *     controlNetId: '12345',
 *   },
 *   isDisabled: getIsUploadDisabled(),
 * });
 *
 * // open the uploaded directly
 * const handleSomething = () => { openUploader() }
 *
 * // in the render function
 * <Button {...getUploadButtonProps()} /> // will open the file dialog on click
 * <input {...getUploadInputProps()} /> // hidden, handles native upload functionality
 */
export const useImageUploadButton = ({
  postUploadAction,
  isDisabled,
  allowMultiple = false,
}: UseImageUploadButtonArgs) => {
  const autoAddBoardId = useAppSelector(selectAutoAddBoardId);
  const [uploadImage] = useUploadImageMutation();
  const maxImageUploadCount = useAppSelector(selectMaxImageUploadCount);
  const { t } = useTranslation();
  const [bulkUploadImages] = useBulkUploadImagesMutation();

  const onDropAccepted = useCallback(
    async (files: File[]) => {
      if (files.length > 1) {
        try {
          toast({
            id: 'BULK_UPLOAD',
            title: t('gallery.bulkUploadRequested'),
            status: 'info',
            duration: null,
          });
          await bulkUploadImages({
            bulk_upload_id: $queueId.get(),
            files,
            board_id: autoAddBoardId === 'none' ? undefined : autoAddBoardId,
          }).unwrap();
        } catch (error) {
          toast({
            status: 'error',
            title: t('gallery.bulkUploadRequestFailed'),
          });
          throw error;
        }
      } else if (files[0]) {
        uploadImage({
          file: files[0],
          image_category: 'user',
          is_intermediate: false,
          postUploadAction: postUploadAction ?? { type: 'TOAST' },
          board_id: autoAddBoardId === 'none' ? undefined : autoAddBoardId,
        });
      }
    },
    [autoAddBoardId, postUploadAction, uploadImage, bulkUploadImages, t]
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const errors = fileRejections.map((rejection) => ({
          errors: rejection.errors.map(({ message }) => message),
          file: rejection.file.path,
        }));
        log.error({ errors }, 'Invalid upload');
        const description =
          maxImageUploadCount === undefined
            ? t('toast.uploadFailedInvalidUploadDesc')
            : t('toast.uploadFailedInvalidUploadDesc_withCount', { count: maxImageUploadCount });

        toast({
          id: 'UPLOAD_FAILED',
          title: t('toast.uploadFailed'),
          description,
          status: 'error',
        });

        return;
      }
    },
    [maxImageUploadCount, t]
  );

  const {
    getRootProps: getUploadButtonProps,
    getInputProps: getUploadInputProps,
    open: openUploader,
  } = useDropzone({
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg', '.png'] },
    onDropAccepted,
    onDropRejected,
    disabled: isDisabled,
    noDrag: true,
    multiple: allowMultiple && (maxImageUploadCount === undefined || maxImageUploadCount > 1),
    maxFiles: maxImageUploadCount,
  });

  return { getUploadButtonProps, getUploadInputProps, openUploader };
};

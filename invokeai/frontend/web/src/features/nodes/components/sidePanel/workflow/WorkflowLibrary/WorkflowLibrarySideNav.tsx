import type { ButtonProps, CheckboxProps } from '@invoke-ai/ui-library';
import {
  Button,
  ButtonGroup,
  Checkbox,
  Collapse,
  Flex,
  IconButton,
  Spacer,
  Text,
  Tooltip,
} from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { getOverlayScrollbarsParams, overlayScrollbarsStyles } from 'common/components/OverlayScrollbars/constants';
import type { WorkflowLibraryView, WorkflowTagCategory } from 'features/nodes/store/workflowLibrarySlice';
import {
  $workflowLibraryCategoriesOptions,
  $workflowLibraryTagCategoriesOptions,
  $workflowLibraryTagOptions,
  selectWorkflowLibrarySelectedTags,
  selectWorkflowLibraryView,
  workflowLibraryTagsReset,
  workflowLibraryTagToggled,
  workflowLibraryViewChanged,
} from 'features/nodes/store/workflowLibrarySlice';
import { NewWorkflowButton } from 'features/workflowLibrary/components/NewWorkflowButton';
import { UploadWorkflowButton } from 'features/workflowLibrary/components/UploadWorkflowButton';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArrowCounterClockwiseBold, PiUsersBold } from 'react-icons/pi';
import { useDispatch } from 'react-redux';
import { useGetCountsByTagQuery } from 'services/api/endpoints/workflows';

export const WorkflowLibrarySideNav = () => {
  const { t } = useTranslation();
  const categoryOptions = useStore($workflowLibraryCategoriesOptions);
  const view = useAppSelector(selectWorkflowLibraryView);
  const dispatch = useAppDispatch();
  const selectedTags = useAppSelector(selectWorkflowLibrarySelectedTags);
  const resetTags = useCallback(() => {
    dispatch(workflowLibraryTagsReset());
  }, [dispatch]);

  return (
    <Flex h="full" minH={0} overflow="hidden" flexDir="column" w={64} gap={0}>
      <Flex flexDir="column" w="full" pb={2}>
        <WorkflowLibraryViewButton view="recent">{t('workflows.recentlyOpened')}</WorkflowLibraryViewButton>
      </Flex>
      <Flex flexDir="column" w="full" pb={2}>
        <WorkflowLibraryViewButton view="yours">{t('workflows.yourWorkflows')}</WorkflowLibraryViewButton>
        {categoryOptions.includes('project') && (
          <Collapse in={view === 'yours' || view === 'shared' || view === 'private'}>
            <Flex flexDir="column" gap={2} pl={4} pt={2}>
              <WorkflowLibraryViewButton size="sm" view="private">
                {t('workflows.private')}
              </WorkflowLibraryViewButton>
              <WorkflowLibraryViewButton size="sm" rightIcon={<PiUsersBold />} view="shared">
                {t('workflows.shared')}
                <Spacer />
              </WorkflowLibraryViewButton>
            </Flex>
          </Collapse>
        )}
      </Flex>
      <Flex h="full" minH={0} overflow="hidden" flexDir="column">
        {view === 'defaults' && selectedTags.length > 0 ? (
          <ButtonGroup>
            <WorkflowLibraryViewButton view="defaults" w="auto">
              {t('workflows.browseWorkflows')}
            </WorkflowLibraryViewButton>
            <Tooltip label={t('workflows.deselectAll')}>
              <IconButton
                onClick={resetTags}
                size="md"
                aria-label={t('workflows.deselectAll')}
                icon={<PiArrowCounterClockwiseBold size={12} />}
                variant="ghost"
                bg="base.700"
                color="base.50"
              />
            </Tooltip>
          </ButtonGroup>
        ) : (
          <WorkflowLibraryViewButton view="defaults">{t('workflows.browseWorkflows')}</WorkflowLibraryViewButton>
        )}
        <DefaultsViewCheckboxesCollapsible />
      </Flex>
      <Spacer />
      <NewWorkflowButton />
      <UploadWorkflowButton />
    </Flex>
  );
};

const overlayscrollbarsOptions = getOverlayScrollbarsParams({ visibility: 'visible' }).options;

const DefaultsViewCheckboxesCollapsible = memo(() => {
  const tagCategoryOptions = useStore($workflowLibraryTagCategoriesOptions);
  const view = useAppSelector(selectWorkflowLibraryView);

  return (
    <Collapse in={view === 'defaults'}>
      <Flex flexDir="column" gap={2} pl={4} py={2} overflow="hidden" h="100%" minH={0}>
        <OverlayScrollbarsComponent style={overlayScrollbarsStyles} options={overlayscrollbarsOptions}>
          <Flex flexDir="column" gap={2} overflow="auto">
            {tagCategoryOptions.map((tagCategory) => (
              <TagCategory key={tagCategory.categoryTKey} tagCategory={tagCategory} />
            ))}
          </Flex>
        </OverlayScrollbarsComponent>
      </Flex>
    </Collapse>
  );
});
DefaultsViewCheckboxesCollapsible.displayName = 'DefaultsViewCheckboxes';

const useCountForIndividualTag = (tag: string) => {
  const allTags = useStore($workflowLibraryTagOptions);
  const queryArg = useMemo(
    () =>
      ({
        tags: allTags,
        categories: ['default'],
      }) satisfies Parameters<typeof useGetCountsByTagQuery>[0],
    [allTags]
  );
  const queryOptions = useMemo(
    () =>
      ({
        selectFromResult: ({ data }) => ({
          count: data?.[tag] ?? 0,
        }),
      }) satisfies Parameters<typeof useGetCountsByTagQuery>[1],
    [tag]
  );

  const { count } = useGetCountsByTagQuery(queryArg, queryOptions);

  return count;
};

const useCountForTagCategory = (tagCategory: WorkflowTagCategory) => {
  const allTags = useStore($workflowLibraryTagOptions);
  const queryArg = useMemo(
    () =>
      ({
        tags: allTags,
        categories: ['default'], // We only allow filtering by tag for default workflows
      }) satisfies Parameters<typeof useGetCountsByTagQuery>[0],
    [allTags]
  );
  const queryOptions = useMemo(
    () =>
      ({
        selectFromResult: ({ data }) => {
          if (!data) {
            return { count: 0 };
          }
          return {
            count: tagCategory.tags.reduce((acc, tag) => acc + (data[tag] ?? 0), 0),
          };
        },
      }) satisfies Parameters<typeof useGetCountsByTagQuery>[1],
    [tagCategory]
  );

  const { count } = useGetCountsByTagQuery(queryArg, queryOptions);

  return count;
};

const WorkflowLibraryViewButton = memo(({ view, ...rest }: ButtonProps & { view: WorkflowLibraryView }) => {
  const dispatch = useDispatch();
  const selectedView = useAppSelector(selectWorkflowLibraryView);
  const onClick = useCallback(() => {
    dispatch(workflowLibraryViewChanged(view));
  }, [dispatch, view]);

  return (
    <Button
      variant="ghost"
      justifyContent="flex-start"
      size="md"
      flexShrink={0}
      w="full"
      onClick={onClick}
      {...rest}
      bg={selectedView === view ? 'base.700' : undefined}
      color={selectedView === view ? 'base.50' : undefined}
    />
  );
});
WorkflowLibraryViewButton.displayName = 'NavButton';

const TagCategory = memo(({ tagCategory }: { tagCategory: WorkflowTagCategory }) => {
  const { t } = useTranslation();
  const count = useCountForTagCategory(tagCategory);

  if (count === 0) {
    return null;
  }

  return (
    <Flex flexDir="column" gap={2}>
      <Text fontWeight="semibold" color="base.300" flexShrink={0}>
        {t(tagCategory.categoryTKey)}
      </Text>
      <Flex flexDir="column" gap={2} pl={4}>
        {tagCategory.tags.map((tag) => (
          <TagCheckbox key={tag} tag={tag} />
        ))}
      </Flex>
    </Flex>
  );
});
TagCategory.displayName = 'TagCategory';

const TagCheckbox = memo(({ tag, ...rest }: CheckboxProps & { tag: string }) => {
  const dispatch = useAppDispatch();
  const selectedTags = useAppSelector(selectWorkflowLibrarySelectedTags);
  const isChecked = selectedTags.includes(tag);
  const count = useCountForIndividualTag(tag);

  const onChange = useCallback(() => {
    dispatch(workflowLibraryTagToggled(tag));
  }, [dispatch, tag]);

  if (count === 0) {
    return null;
  }

  return (
    <Checkbox isChecked={isChecked} onChange={onChange} {...rest} flexShrink={0}>
      <Text>{`${tag} (${count})`}</Text>
    </Checkbox>
  );
});
TagCheckbox.displayName = 'TagCheckbox';

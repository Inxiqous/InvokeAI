import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { SystemStyleObject } from '@invoke-ai/ui-library';
import { Button, ButtonGroup, Flex, Spacer } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import ScrollableContent from 'common/components/OverlayScrollbars/ScrollableContent';
import { firefoxDndFix } from 'features/dnd/util';
import { FormElementComponent } from 'features/nodes/components/sidePanel/builder/ContainerElementComponent';
import { buildFormElementDndData, useBuilderDndMonitor } from 'features/nodes/components/sidePanel/builder/dnd-hooks';
import { WorkflowBuilderEditMenu } from 'features/nodes/components/sidePanel/builder/WorkflowBuilderMenu';
import { selectFormRootElementId, selectIsFormEmpty } from 'features/nodes/store/workflowSlice';
import type { FormElement } from 'features/nodes/types/workflow';
import { buildContainer, buildDivider, buildHeading, buildText } from 'features/nodes/types/workflow';
import { startCase } from 'lodash-es';
import type { RefObject } from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assert } from 'tsafe';

const sx: SystemStyleObject = {
  pt: 3,
  '&[data-is-empty="true"]': {
    w: 'full',
    h: 'full',
    pt: 0,
  },
};

export const WorkflowBuilder = memo(() => {
  const { t } = useTranslation();
  const rootElementId = useAppSelector(selectFormRootElementId);
  const isFormEmpty = useAppSelector(selectIsFormEmpty);
  useBuilderDndMonitor();

  return (
    <Flex justifyContent="center" w="full" h="full">
      <Flex flexDir="column" w="full" maxW="768px" gap={2}>
        <ButtonGroup isAttached={false} justifyContent="center" size="sm">
          <AddFormElementDndButton type="container" />
          <AddFormElementDndButton type="divider" />
          <AddFormElementDndButton type="heading" />
          <AddFormElementDndButton type="text" />
          <Button variant="ghost" tooltip={t('workflows.builder.nodeFieldTooltip')}>
            {t('workflows.builder.nodeField')}
          </Button>
          <Spacer />
          <WorkflowBuilderEditMenu />
        </ButtonGroup>
        <ScrollableContent>
          <Flex sx={sx} data-is-empty={isFormEmpty}>
            <FormElementComponent id={rootElementId} />
          </Flex>
        </ScrollableContent>
      </Flex>
    </Flex>
  );
});
WorkflowBuilder.displayName = 'WorkflowBuilder';

const useAddFormElementDnd = (
  type: Exclude<FormElement['type'], 'node-field'>,
  draggableRef: RefObject<HTMLElement>
) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const draggableElement = draggableRef.current;
    if (!draggableElement) {
      return;
    }
    return combine(
      firefoxDndFix(draggableElement),
      draggable({
        element: draggableElement,
        getInitialData: () => {
          if (type === 'container') {
            const element = buildContainer('row', []);
            return buildFormElementDndData(element);
          }
          if (type === 'divider') {
            const element = buildDivider();
            return buildFormElementDndData(element);
          }
          if (type === 'heading') {
            const element = buildHeading('');
            return buildFormElementDndData(element);
          }
          if (type === 'text') {
            const element = buildText('');
            return buildFormElementDndData(element);
          }
          assert(false);
        },
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      })
    );
  }, [draggableRef, type]);

  return isDragging;
};

const AddFormElementDndButton = ({ type }: { type: Parameters<typeof useAddFormElementDnd>[0] }) => {
  const draggableRef = useRef<HTMLDivElement>(null);
  const isDragging = useAddFormElementDnd(type, draggableRef);

  return (
    <Button as="div" ref={draggableRef} variant="outline" cursor="grab" borderStyle="dashed" isDisabled={isDragging}>
      {startCase(type)}
    </Button>
  );
};

import type { FormLabelProps } from '@invoke-ai/ui-library';
import { Expander, Flex, FormControlGroup, StandaloneAccordion } from '@invoke-ai/ui-library';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppSelector } from 'app/store/storeHooks';
import { selectParamsSlice } from 'features/controlLayers/store/paramsSlice';
import { selectCanvasSlice } from 'features/controlLayers/store/selectors';
import { HrfSettings } from 'features/hrf/components/HrfSettings';
import { selectHrfSlice } from 'features/hrf/store/hrfSlice';
import BboxScaledHeight from 'features/parameters/components/Bbox/BboxScaledHeight';
import BboxScaledWidth from 'features/parameters/components/Bbox/BboxScaledWidth';
import BboxScaleMethod from 'features/parameters/components/Bbox/BboxScaleMethod';
import { BboxSettings } from 'features/parameters/components/Bbox/BboxSettings';
import ParamImageToImageStrength from 'features/parameters/components/Canvas/ParamImageToImageStrength';
import { ParamSeedNumberInput } from 'features/parameters/components/Seed/ParamSeedNumberInput';
import { ParamSeedRandomize } from 'features/parameters/components/Seed/ParamSeedRandomize';
import { ParamSeedShuffle } from 'features/parameters/components/Seed/ParamSeedShuffle';
import { useExpanderToggle } from 'features/settingsAccordions/hooks/useExpanderToggle';
import { useStandaloneAccordionToggle } from 'features/settingsAccordions/hooks/useStandaloneAccordionToggle';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const selector = createMemoizedSelector(
  [selectHrfSlice, selectCanvasSlice, selectParamsSlice],
  (hrf, canvas, params) => {
    const { shouldRandomizeSeed, model } = params;
    const { hrfEnabled } = hrf;
    const badges: string[] = [];
    const isSDXL = model?.base === 'sdxl';

    const { aspectRatio } = canvas.bbox;
    const { width, height } = canvas.bbox.rect;

    badges.push(`${width}×${height}`);
    badges.push(aspectRatio.id);

    if (aspectRatio.isLocked) {
      badges.push('locked');
    }

    if (!shouldRandomizeSeed) {
      badges.push('Manual Seed');
    }

    if (hrfEnabled && !isSDXL) {
      badges.push('HiRes Fix');
    }
    return { badges, isSDXL };
  }
);

const scalingLabelProps: FormLabelProps = {
  minW: '4.5rem',
};

export const ImageSettingsAccordion = memo(() => {
  const { t } = useTranslation();
  const { badges, isSDXL } = useAppSelector(selector);
  const { isOpen: isOpenAccordion, onToggle: onToggleAccordion } = useStandaloneAccordionToggle({
    id: 'image-settings',
    defaultIsOpen: true,
  });
  const { isOpen: isOpenExpander, onToggle: onToggleExpander } = useExpanderToggle({
    id: 'image-settings-advanced',
    defaultIsOpen: false,
  });

  return (
    <StandaloneAccordion
      label={t('accordions.image.title')}
      badges={badges}
      isOpen={isOpenAccordion}
      onToggle={onToggleAccordion}
    >
      <Flex px={4} pt={4} w="full" h="full" flexDir="column" data-testid="image-settings-accordion">
        <Flex flexDir="column" gap={4}>
          <BboxSettings />
          <ParamImageToImageStrength />
        </Flex>
        <Expander label={t('accordions.advanced.options')} isOpen={isOpenExpander} onToggle={onToggleExpander}>
          <Flex gap={4} pb={4} flexDir="column">
            <Flex gap={4} alignItems="center">
              <ParamSeedNumberInput />
              <ParamSeedShuffle />
              <ParamSeedRandomize />
            </Flex>
            {!isSDXL && <HrfSettings />}
            <BboxScaleMethod />
            <FormControlGroup formLabelProps={scalingLabelProps}>
              <BboxScaledWidth />
              <BboxScaledHeight />
            </FormControlGroup>
          </Flex>
        </Expander>
      </Flex>
    </StandaloneAccordion>
  );
});

ImageSettingsAccordion.displayName = 'ImageSettingsAccordion';

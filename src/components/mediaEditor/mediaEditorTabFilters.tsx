import {createEffect} from 'solid-js';
import {LangPackKey} from '../../lib/langPack';
import I18n from '../../lib/langPack';
import {RangeSelectorSolid} from '../rangeSelectorTsx';
import {useMediaEditor} from './mediaEditorContext';

export type MediaEditorActionFilterTypes = 'enhance' | 'brightness' | 'contrast' | 'saturation' | 'warmth' | 'fade' | 'highlights' | 'shadows' | 'vignette' | 'grain' | 'sharpen';

export type MediaEditorActionFilter = {
  action: 'filter',
  type: MediaEditorActionFilterTypes,
  amount: number
}

const MediaEditorTabFiltersSection = (props: {
  title: LangPackKey,
  min: number,
  max: number,
  center: boolean,
  type: MediaEditorActionFilterTypes,
}) => {
  const {stackDonePush, canvas, stackDone, mediaEditor, stackUndone, settings, setSettings} = useMediaEditor();

  createEffect(() => {
    const inDone = stackDone().find(item => (item.action == 'filter' && item.type == props.type));
    const inUndone = stackUndone().find(item => (item.action == 'filter' && item.type == props.type));
    if(inDone && inDone.action == 'filter') {
      setSettings('filters', props.type, inDone.amount);
    } else if(inUndone && inUndone.action == 'filter') {
      setSettings('filters', props.type, 0);
    }
  });

  createEffect(() => {
    rangeSelector.setFilled(settings.filters[props.type]);
  });

  const onChange = () => {
    stackDonePush({
      action: 'filter',
      type: props.type,
      amount: settings.filters[props.type]
    });
    mediaEditor.render(canvas, stackDone());
  };

  const rangeSelector = RangeSelectorSolid({
    step: 1,
    value: settings.filters[props.type],
    min: props.min,
    max: props.max,
    withTransition: false,
    center: props.center,
    onScrub: (val) => {
      if(val != settings.filters[props.type]) {
        setSettings('filters', props.type, val);
      }
    },
    onMouseUp: () => {
      onChange();
    }
  });

  return (
    <div class='media-editor-tab-filters-section'>
      <div>
        <b>{I18n.format(props.title)}</b>
        <span>{settings.filters[props.type]}</span>
      </div>
      {rangeSelector.container}
    </div>
  );
}

const MediaEditorTabFilters = () => {
  return (
    <div id='media-editor-tab-filters' class='media-editor-tab'>
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Enhance' center={false} min={0} max={100} type='enhance' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Brightness' center={true} min={-100} max={100} type='brightness' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Contrast' center={true} min={-100} max={100} type='contrast' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Saturation' center={true} min={-100} max={100} type='saturation' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Warmth' center={true} min={-100} max={100} type='warmth' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Fade' center={false} min={0} max={100} type='fade' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Highlights' center={true} min={-100} max={100} type='highlights' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Shadows' center={true} min={-100} max={100} type='shadows' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Vignette' center={false} min={0} max={100} type='vignette' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Grain' center={false} min={0} max={100} type='grain' />
      <MediaEditorTabFiltersSection title='MediaEditor.Enhance.Sharpen' center={false} min={0} max={100} type='sharpen' />
    </div>
  );
}

export default MediaEditorTabFilters;

import {attachClickEvent} from '../helpers/dom/clickEvent';
import Icon from './icon';

export type IconButtonGroupItemOptions = {
  icon: Icon,
  onClick: (e: MouseEvent | TouchEvent) => any,
}

export type IconButtonGroupOptions = {
  className?: string,
  buttons: IconButtonGroupItemOptions[]
}

export default function IconButtonGroup(options: IconButtonGroupOptions) {
  const container = document.createElement('div');
  container.classList.add('icon-button-group-container')

  if('className' in options) {
    container.classList.add(options.className);
  }

  options.buttons.forEach((item) => {
    const button = document.createElement('span');
    const icon = Icon(item.icon, item.icon);

    attachClickEvent(button, (e) => {
      e.preventDefault();
      item.onClick(e);
    })

    button.appendChild(icon);
    container.appendChild(button);
  });

  return container;
}

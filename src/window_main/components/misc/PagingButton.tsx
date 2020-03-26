import styled from "styled-components";

interface PagingButtonProps {
  selected?: boolean;
}

export const PagingButtonBase = styled.button.attrs<PagingButtonProps>(
  props => ({
    className:
      (props.className ?? "") +
      (props.disabled ? " paging_button_disabled" : " paging_button") +
      (props.selected ? " paging_active" : "")
  })
)`
  width: initial;
  height: initial;
  minwidth: 30px;
`;

export const PagingButton = styled(PagingButtonBase)<PagingButtonProps>``;

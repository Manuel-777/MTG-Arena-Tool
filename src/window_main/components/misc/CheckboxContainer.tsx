import styled from "styled-components";

export const CheckboxContainer = styled.label.attrs(props => ({
  className: (props.className ?? "") + " check_container hover_label"
}))`
  display: inline-flex;
`;

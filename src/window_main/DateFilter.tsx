import React from 'react';
import { ReactSelect, ReactSelectProps } from '../shared/ReactSelect';

export interface DateFilterProps extends ReactSelectProps {
    prefixId: string;
    showArchivedFilter?: boolean;
    showArchivedValue?: boolean;
    onArchiveClick?: (newValue: boolean) => void;
}

export default function DateFilter(props: DateFilterProps) {
    const [ showArchived, setShowArchived ] = React.useState(props.showArchivedValue);
    
    const onClickArchiveCheckbox = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.currentTarget.checked;
      if (newValue != showArchived) {
        setShowArchived(newValue);
        props.onArchiveClick && props.onArchiveClick(newValue);
      }
    }, [props.onArchiveClick, showArchived]);
    
    const { prefixId, options, current, callback, showArchivedFilter } = props;
    return (
      <div className={"dateCont"}>
        <div className={"select_container filter_panel_select_margin " + prefixId + "_query_date"}>
            <ReactSelect options={options} current={current} callback={callback} />
        </div>
        {showArchivedFilter && (
          <label className={"archive_label check_container hover_label"}>
            {"archived"}
            <input type={"checkbox"} id={prefixId + "_query_archived"} checked={showArchived} onChange={onClickArchiveCheckbox}></input>
            <span className={"checkmark"} />
          </label>
        )}
      </div>
    )
}
var React = require('react');

// parent,
// options,
// current,
// callback,
// divClass,
// optionFormatter

exports.reactSelect = reactSelect;
function reactSelect(props) {
    const [curValue, setCurValue] = React.useState(() => {
        return this.props.current;
    }, [this.props.current]);

    const [optionsShown, setOptionsShown] = React.useState(() => {
        return false;
    }, []);

    const toggleOptionsVisible = React.useCallback(() => {
        setOptionsShown(!optionsShown);
    }, [optionsShown, setOptionsShown]);

    const onSelectOption = React.useCallback((event) => {
        console.log(event.currentTarget.value);
    });

    const optionsInDropdown = React.useMemo(() => {
        return this.props.options.filter(value => value != curValue);
    }, [this.props.options, curValue]);
    return (
        <div
            className={"select_container"}
            value={this.props.current}>
            <div
                className={"select_button"}
                onClick={toggleOptionsVisible}>
                {this.props.optionFormatter(curValue)}
            </div>
            {optionsShown && 
                <div className={"select_options_container"}>{
                    optionsInDropdown.map(value => {
                        return (
                            <div 
                                className={"select_option"}
                                value={value}
                                key={value}
                                onClick={onSelectOption}>
                                {this.props.optionFormatter(value)}
                            </div>
                        )
                    })
                }</div>
            }
        </div>
    );
}
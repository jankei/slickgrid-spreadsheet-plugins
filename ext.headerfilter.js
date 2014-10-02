(function ($) {
    $.extend(true, window, {
        "Ext": {
            "Plugins": {
                "HeaderFilter": HeaderFilter
            }
        }
    });

    /*
    Based on SlickGrid Header Menu Plugin (https://github.com/mleibman/SlickGrid/blob/master/plugins/slick.headermenu.js)

    (Can't be used at the same time as the header menu plugin as it implements the dropdown in the same way)


    */

    function HeaderFilter(options) {
        var grid;
        var self = this;
        var handler = new Slick.EventHandler();
        var defaults = {
            buttonImage: "../images/down.png",
            filterImage: "../images/filter.png",
            sortAscImage: "../images/sort-asc.png",
            sortDescImage: "../images/sort-desc.png"
        };
        var $menu;
        var filterType = {
            "WILDCARD": 0,
            "RANGE": 1,
            "MULTI_SELECT": 2,
            "PERCENTAGE": 3,
            "DATE": 4
        };

        function init(g) {
            options = $.extend(true, {}, defaults, options);
            grid = g;
            handler.subscribe(grid.onHeaderCellRendered, handleHeaderCellRendered)
                   .subscribe(grid.onBeforeHeaderCellDestroy, handleBeforeHeaderCellDestroy)
                   .subscribe(grid.onClick, handleBodyMouseDown)
                   .subscribe(grid.onColumnsResized, columnsResized);

            grid.setColumns(grid.getColumns());

            $(document.body).bind("mousedown", handleBodyMouseDown);
        }

        function destroy() {
            handler.unsubscribeAll();
            $(document.body).unbind("mousedown", handleBodyMouseDown);
        }

        function handleBodyMouseDown(e) {
            if ($menu && $menu[0] != e.target && !$.contains($menu[0], e.target)) {
//                hideMenu();
            }
        }

        function hideMenu() {
            if ($menu) {
                $menu.remove();
                $menu = null;
            }
        }

        function handleHeaderCellRendered(e, args) {
            console.log('handleHeaderCellRendered');
            var column = args.column;
            if (column.filter === undefined) return;

            var $el = $("<div></div>")
                .addClass("slick-header-menubutton")
                .data("column", column);

            if (options.buttonImage) {
                $el.css("background-image", "url(" + options.buttonImage + ")");
            }

            $el.bind("click", showFilter).appendTo(args.node);
        }

        function handleBeforeHeaderCellDestroy(e, args) {
            $(args.node)
                .find(".slick-header-menubutton")
                .remove();
        }

        function addMenuItem(menu, columnDef, title, command, image) {
            var $item = $("<div class='slick-header-menuitem'>")
                         .data("command", command)
                         .data("column", columnDef)
                         .bind("click", handleMenuItemClick)
                         .appendTo(menu);

            var $icon = $("<div class='slick-header-menuicon'>")
                         .appendTo($item);

            if (image) {
                $icon.css("background-image", "url(" + image + ")");
            }

            $("<span class='slick-header-menucontent'>")
             .text(title)
             .appendTo($item);
        }

        function showFilter(e) {
            var $menuButton = $(this);
            var columnDef = $menuButton.data("column");

            columnDef.filterValues = columnDef.filterValues || [];
            columnDef.rangeValues = columnDef.rangeValues || [];
            columnDef.dateValues = columnDef.dateValues || [];
            columnDef.percentageValues = columnDef.percentageValues || [];
            columnDef.wildcardValues = columnDef.wildcardValues || [];

            // WorkingFilters is a copy of the filters to enable apply/cancel behaviour
            var workingFilters;;
            switch (columnDef.filter){
                case filterType.WILDCARD:
                    workingFilters = columnDef.wildcardValues.slice(0);
                    break;
                case filterType.RANGE:
                    workingFilters = columnDef.rangeValues.slice(0);
                    break;
                case filterType.MULTI_SELECT:
                    workingFilters = columnDef.filterValues.slice(0);
                    break;
                case filterType.PERCENTAGE:
                    workingFilters = columnDef.percentageValues.slice(0);
                    break;
                case filterType.DATE:
                    workingFilters = columnDef.dateValues.slice(0);
                    break;
            }

            var filterItems;

            if (workingFilters.length === 0) {
                // Filter based all available values
                filterItems = getFilterValues(grid.getData(), columnDef);
            }
            else {
                // Filter based on current dataView subset
                filterItems = getAllFilterValues(grid.getData().getItems(), columnDef);
            }

            if (!$menu) {
                $menu = $("<div class='slick-header-menu'>").appendTo(document.body);
            }

            $menu.empty();

            if (options.showSortInMenu){
                addMenuItem($menu, columnDef, 'Sort Ascending', 'sort-asc', options.sortAscImage);
                addMenuItem($menu, columnDef, 'Sort Descending', 'sort-desc', options.sortDescImage);
            }


            var filterOptions;
            switch (columnDef.filter){
                case filterType.WILDCARD:
                    var inputVal = columnDef.wildcardValues.length > 0 ? columnDef.wildcardValues[0] : '';
                    filterOptions = "<label><input type='text' value='" + inputVal + "' /></label>";
                    break;
                case filterType.RANGE:
                    var rangeFromVal = columnDef.rangeValues.length > 0 ? columnDef.rangeValues[0] : '';
                    var rangeToVal = columnDef.rangeValues.length > 1 ? columnDef.rangeValues[1] : '';
                    filterOptions = "<label><input type='number' id='from' value='" + rangeFromVal + "'  /> <br>to<br> <input type='number' id='to' value='" + rangeToVal + "'  /></label>";
                    break;
                case filterType.MULTI_SELECT:
                    filterOptions = "<label><input type='checkbox' value='-1' />(Select All)</label>";
                    for (var i = 0; i < filterItems.length; i++) {
                        var filtered = _.contains(workingFilters, filterItems[i]);

                        filterOptions += "<label><input type='checkbox' value='" + i + "'"
                            + (filtered ? " checked='checked'" : "")
                            + "/>" + filterItems[i] + "</label>";
                    }
                    break;
                case filterType.PERCENTAGE:
                    var inputVal = columnDef.percentageValues.length > 0 ? columnDef.percentageValues[0] : '';
                    filterOptions = "<label><input type='range' id='percentage' min='0' max='100' value='" + inputVal + "' /></label>";
                    break;
                case filterType.DATE:
                    filterOptions = "<label><input name='daterange' id='daterange'></label>";
                    break;
            }

            var $filter = $("<div class='filter'>")
                           .append($(filterOptions))
                           .appendTo($menu);

            if (columnDef.filter === filterType.DATE)
            {
                var dateFromVal = columnDef.dateValues.length > 0 ? columnDef.dateValues[0] : moment();
                var dateToVal = columnDef.dateValues.length > 1 ? columnDef.dateValues[1] : moment();
                $('#daterange').daterangepicker({
                    startDate: dateFromVal,
                    endDate: dateToVal,
                    parentEl:'.filter',
                    ranges:{
                        'Today': moment(),
                        'Week': [moment().startOf('week'), moment()],
                        'Month': [moment().startOf('month'), moment()],
                        'Quarter': [moment().startOf('quarter'), moment()],
                        'Year': [moment().startOf('year'), moment()]
                    }
                });
                $('#daterange').on('apply.daterangepicker', function(ev, picker) {
                    columnDef.dateValues[0] = picker.startDate.format('DD-MM-YYYY');
                    columnDef.dateValues[1] = picker.endDate.format('DD-MM-YYYY');
                });
                $('#daterange').on('cancel.daterangepicker', function(ev, picker) {
                    $('#daterange').val('');
                });
            }

            $('<button>OK</button>')
                .appendTo($menu)
                .bind('click', function (ev) {
                    switch (columnDef.filter){
                        case filterType.WILDCARD:
                            columnDef.wildcardValues = workingFilters.splice(0);
                            setButtonImage($menuButton,
                                    columnDef.wildcardValues.length > 0
                            );
                            break;
                        case filterType.RANGE:
                            columnDef.rangeValues = workingFilters.splice(0);
                            setButtonImage($menuButton,
                                    columnDef.rangeValues.length > 1
                            );
                            break;
                        case filterType.MULTI_SELECT:
                            columnDef.wildcardValues = workingFilters.splice(0);
                            setButtonImage($menuButton,
                                    columnDef.filterValues.length > 0
                            );
                            break;
                        case filterType.PERCENTAGE:
                            columnDef.percentageValues = workingFilters.splice(0);
                            setButtonImage($menuButton,
                                    columnDef.percentageValues.length > 0
                            );
                            break;
                        case filterType.DATE:
//                            columnDef.dateValues = workingFilters.splice(0);
                            setButtonImage($menuButton,
                                    columnDef.dateValues.length > 1
                            );
                            break;
                    }


                    handleApply(ev, columnDef);
                });

            $('<button>Clear</button>')
                .appendTo($menu)
                .bind('click', function (ev) {
                    columnDef.filterValues.length = 0;
                    columnDef.rangeValues.length = 0;
                    columnDef.dateValues.length = 0;
                    columnDef.wildcardValues.length = 0;
                    setButtonImage($menuButton, false);
                    handleApply(ev, columnDef);
                });

            $('<button>Cancel</button>')
                .appendTo($menu)
                .bind('click', hideMenu);

            $(':checkbox', $filter).bind('click', function () {
                workingFilters = changeWorkingFilter(filterItems, workingFilters, $(this));
            });

            $(':text', $filter).bind('change keyup', function () {
                workingFilters[0] = $(this).val();
            });

            $('#from', $filter).bind('change keyup', function () {
                workingFilters[0] = $(this).val();
            });

            $('#to', $filter).bind('change keyup', function () {
                workingFilters[1] = $(this).val();
            });

            $('#percentage', $filter).bind('change keyup', function () {
                workingFilters[0] = $(this).val();
            });


            var offset = $(this).offset();
            var left = offset.left - $menu.width() + $(this).width() - 8;

            $menu.css("top", offset.top + $(this).height())
                 .css("left", (left > 0 ? left : 0));
        }

        function columnsResized() {
            hideMenu();
        }

        function changeWorkingFilter(filterItems, workingFilters, $checkbox) {
            var value = $checkbox.val();
            var $filter = $checkbox.parent().parent();

            if ($checkbox.val() < 0) {
                // Select All
                if ($checkbox.prop('checked')) {
                    $(':checkbox', $filter).prop('checked', true);
                    workingFilters = filterItems.slice(0);
                } else {
                    $(':checkbox', $filter).prop('checked', false);
                    workingFilters.length = 0;
                }
            } else {
                var index = _.indexOf(workingFilters, filterItems[value]);

                if ($checkbox.prop('checked') && index < 0) {
                    workingFilters.push(filterItems[value]);
                }
                else {
                    if (index > -1) {
                        workingFilters.splice(index, 1);
                    }
                }
            }

            return workingFilters;
        }

        function setButtonImage($el, filtered) {
            var image = "url(" + (filtered ? options.filterImage : options.buttonImage) + ")";

            $el.css("background-image", image);
        }

        function handleApply(e, columnDef) {
            hideMenu();

            self.onFilterApplied.notify({ "grid": grid, "column": columnDef }, e, self);

            e.preventDefault();
            e.stopPropagation();
        }

        function getFilterValues(dataView, column) {
            var seen = [];
            for (var i = 0; i < dataView.getLength() ; i++) {
                var value = dataView.getItem(i)[column.field];

                if (!_.contains(seen, value)) {
                    seen.push(value);
                }
            }

            return _.sortBy(seen, function (v) { return v; });
        }

        function getAllFilterValues(data, column) {
            var seen = [];
            for (var i = 0; i < data.length; i++) {
                var value = data[i][column.field];

                if (!_.contains(seen, value)) {
                    seen.push(value);
                }
            }

            return _.sortBy(seen, function (v) { return v; });
        }

        function handleMenuItemClick(e) {
            var command = $(this).data("command");
            var columnDef = $(this).data("column");

            hideMenu();

            self.onCommand.notify({
                "grid": grid,
                "column": columnDef,
                "command": command
            }, e, self);

            e.preventDefault();
            e.stopPropagation();
        }

        function filterFunc(item) {
            var columns = grid.getColumns();

            var value = true;
            for (var i = 0; i < columns.length; i++) {
                var col = columns[i];
                switch (col.filter) {
                    case filterType.WILDCARD:
                        var wildcardValues = col.wildcardValues;
                        if (wildcardValues && wildcardValues.length > 0) {
                            value = value & _.contains(wildcardValues, item[col.field]);
                        }
                        break;
                    case filterType.RANGE:
                        var rangeValues = col.rangeValues;
                        if (rangeValues && rangeValues.length > 1) {
                            value = value & item[col.field] >= rangeValues[0] & item[col.field] <= rangeValues[1];
                        }
                        break;
                    case filterType.MULTI_SELECT:
                        var filterValues = col.filterValues;
                        if (filterValues && filterValues.length > 0) {
                            value = value & _.contains(filterValues, item[col.field]);
                        }

                        break;
                    case filterType.PERCENTAGE:
                        var percentageValues = col.percentageValues;
                        if (percentageValues && percentageValues.length > 0) {
                            value = value & item[col.field] <= percentageValues[0];
                        }
                        break;
                    case filterType.DATE:
                        var dateValues = col.dateValues;
                        if (dateValues && dateValues.length > 1) {
                            value = value & moment(dateValues[0]).isBefore(item[col.field]) & moment(dateValues[1]).isAfter(item[col.field]);
                        }
                        break;
                }
            }
            return value;
        }

        $.extend(this, {
            "init": init,
            "destroy": destroy,
            "onFilterApplied": new Slick.Event(),
            "onCommand": new Slick.Event(),
            "filterFunc": filterFunc,
            "filterType": filterType
        });
    }
})(jQuery);
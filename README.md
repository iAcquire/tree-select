#TreeSelect Plugin

###Options

The TreeSelect plugin supports the following configuration options.

* searchThreshold
	
	Number of characters that need to be entered before a search is performed. Default: 2
	
* searchDelay

	Delay while typing before performing a search (ms). Default: 250ms

* delayLoad

	Used with dataUrl, will delay loading data for the component until a search will be performed.
	
* dataUrl
	
	Url to load data for the component from.
	
* multiSelect

	Allow the user to select multiple options. Default: false

* searchPlaceholder
	
	Text to appear in the input as placeholder text. Default: search

* valueKey

	Key to use in the data as the value of the proxied select input. Default: id

* nameKey

	Key to use in the data to display an option. Default: name

* minDepth

	Minimum depth an item needs to be in the tree to allow selection Default: 0

* allowSingleDeselect

	Allow clearing of a single select component. Default: false

* transformData
	
	Function to call on each item in the data, this will allow any type of data to be used. It should return a record that the component can deal with. Expects the following keys to be present, id, parentId. As well as the keys specified for nameKey and valueKey if they are specified.
	
## Invocation
The TreeSelect plugin is invoked just like any other jQuery plugin. For instance:

``` $('select[name="category"]').treeSelect({valueKey: 'path'}) ```

## Dependencies
The TreeSelect plugin's html generation is based on Twitter Bootstrap, so it uses classnames and structures defined in Twitter Bootstrap. It should work with version 2.3.2 and 3.x. Make sure to include the appropriate css file for the version you have on the page.

* tree-select-bootstrap-3.css

	Use this file if you have version 3.	

* tree-select-bootstrap-2.css

	Use this file if you have version 2.3.2.

* tree-select.css

	Use this file if not using Twitter Bootstrap.
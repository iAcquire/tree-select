/**
 * Created by jason on 12/18/13.
 */
/*globals jQuery */
(function($, namespace){

  function getObjectProperty(object, path){
    var property,
        parts = path.split('.');
    if(typeof object === 'object' && path){
      if(parts.length === 1){
        property = object[parts[0]];
      }else{
        property = getObjectProperty(object[parts[0]], parts.slice(1).join('.'));
      }
    }
    return property;
  }

  function unescape(string){
    var entityMap = {
          '&amp;' : '&',
          '&lt;' : '<',
          '&gt;' : '>',
          '&quot;' : '"',
          '&#x27;' : "'"
        },
        regex = new RegExp('(' + Object.keys(entityMap).join('|') + ')', 'g');
    if(string === null){
      return '';
    }else{
      return (string + '').replace(regex, function(match){
        return entityMap[match];
      });
    }
  }

  // Tree representation 'class' for our data structure.
  var NodeTree = function(options){
    options = options || {};
    // Maintain flat list of nodes for faster searching
    this.nodes = [];
    // Root node
    this.root = null;
    this.searchKey = 'name';
    this.nameKey = 'name';
    this.transformData = options.transformData || null;
  };

  $.extend(NodeTree.prototype, {

    search: function(search){
      // Iterate over the nodes and find matches
      var i,
          length = this.nodes.length,
          node,
          results = [],
          // Escape the search text so we don't throw exceptions for bad regex patterns
          regex = new RegExp(search.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"),'i');

      for(i = 0; i < length; i++){
        node = this.nodes[i];
        if(node[this.searchKey] && node[this.searchKey].match(regex)){
          results.push(node);
        }
      }
      return results;
    },

    findById: function(id){
      var i,
          length = this.nodes.length,
          node = null;
      for(i = 0; i < length; i++){
        if(this.nodes[i].id === id){
          node = this.nodes[i];
          break;
        }
      }
      return node;
    },

    _transformNode: function(node){
      if(this.transformData){
        return this.transformData.call(this, node);
      }else{
        return node;
      }
    },

    _transformNodes: function(nodes){
      var i,
          length = nodes.length,
          transformedNodes = [];

      for(i = 0; i < length; i++){
        transformedNodes.push(this._transformNode(nodes[i]));
      }
      return transformedNodes;
    },

    _buildBranch: function(node, nodes, parentId){
      var i,
          length = nodes.length,
          currNode = null,
          remainingNodes = [];

      node.children = [];

      // Find all the node's children
      for(i = 0; i < length; i++){
        currNode = nodes[i];
        if(currNode.parentId === parentId){
          currNode.depth = node.depth + 1;
          node.children.push(currNode);
          currNode.parent = node;
        }else if(currNode.id !== node.id){
          remainingNodes.push(currNode);
        }
      }

      // Find all of the children's children...
      length = node.children.length;
      for(i = 0; i < length; i++){
        currNode = node.children[i];
        this._buildBranch(currNode, remainingNodes, currNode.id);
      }
    },

    build: function(nodes){
      // New root node
      this.root = {
        children: [],
        parent: null,
        depth: -1
      };

      this.nodes = this._transformNodes(nodes);

      this._buildBranch(this.root, this.nodes, 0);
    },

    getNodePath: function(node){
      var path = [];
      if(node.parent && node.parent !== this.root){
        path = this.getNodePath(node.parent).concat(path);
      }
      path.push(node[this.nameKey]);
      return path;
    }
  });

  // 'Class' for rendering the component
  var TreeSelect = function($el, options){
    options = options || {};
    this.$proxyEl = $el;
    this.$proxyEl.hide();
    this.options = options;
    this.dropdownHasMouse = false;
    this.hoverIdx = false;
    this.nodeTree = new NodeTree(options);
    this.selection = [];
    this.searchResults = [];

    this.searchTimer = null;

    this.hasData = false;

    if(options.data){
      this.hasData = true;
      this.nodeTree.build(options.data);
      this.populateProxy();
    }else if(options.dataUrl){
      if(!options.delayLoad){
        this.loadXHRData(options.dataUrl);
      }
    }else{
      this.hasData = true;
      this.nodeTree.build(this.getNodesFromProxy());
      this.selection = this.getSelectionFromProxy();
    }

    this.render();
    this.renderSelection();
    this.bindEvents();
  };

  $.extend(TreeSelect.prototype, {

    loadXHRData: function(dataUrl, searchAfter){
      $.ajax({
        url: dataUrl,
        dataType: 'json'
      }).done($.proxy(function(data){
        if(this.options.dataPath){
          this.nodeTree.build(getObjectProperty(data, this.options.dataPath));
        }else{
          this.nodeTree.build(data);
        }
        this.populateProxy();
        this.hasData = true;
        if(searchAfter === true){
          this.performSearch();
        }
      },this));
    },

    remove: function(){
      this.$el.remove();
    },

    render: function(){
      this.$el = $('<div/>');
      this.$el.addClass('tree-select');
      this.renderControl();
      this.$el.insertAfter(this.$proxyEl);
    },

    bindEvents: function(){
      this.$el.on('keydown', 'input[type="text"]', $.proxy(this.onSearchKeyDown, this));
      this.$el.on('keyup', 'input[type="text"]', $.proxy(this.onSearchKeyUp, this));
      this.$el.on('blur', 'input[type="text"]', $.proxy(this.onSearchBlur, this));
      this.$el.on('mouseenter', '.dropdown-menu', $.proxy(this.onDropdownMouseEnter, this));
      this.$el.on('mouseleave', '.dropdown-menu', $.proxy(this.onDropdownMouseLeave, this));
      this.$el.on('mouseover', '.dropdown-menu > li > a', $.proxy(this.onResultOver, this));
      this.$el.on('click', '.dropdown-menu > li:not(.disabled) > a', $.proxy(this.onResultClick, this));
    },

    onDropdownMouseEnter: function(evt){
      this.dropdownHasMouse = true;
    },

    onDropdownMouseLeave: function(evt){
      this.dropdownHasMouse = false;
    },

    onResultOver: function(evt){
      this.$el.find('.dropdown-menu > li > a').removeClass('hover');
      this.hoverIdx = $(evt.currentTarget).parent().index();
    },

    onSearchKeyDown: function(evt){
      var $el,
          $dropdown;
      switch(evt.which){
        // Up arrow
        case 38:
          evt.preventDefault();
          if(this.hoverIdx > 0){
            this.hoverIdx -= 1;
            this.$el.find('.dropdown-menu li > a.hover').removeClass('hover');
            $dropdown = this.$el.find('.dropdown-menu');
            $el = this.$el.find('.dropdown-menu > li:nth-child(' + (this.hoverIdx + 1) +') a');
            $el.addClass('hover');
            if($el.position().top < 0){
              $dropdown.scrollTop($dropdown.scrollTop() + $el.position().top);
            }
          }
          break;
        // Down arrow
        case 40:
          evt.preventDefault();
          if(this.hoverIdx < this.searchResults.length - 1){
            this.hoverIdx += 1;
            $dropdown = this.$el.find('.dropdown-menu');
            this.$el.find('.dropdown-menu li > a.hover').removeClass('hover');
            $el = this.$el.find('.dropdown-menu > li:nth-child(' + (this.hoverIdx + 1) +') a');
            $el.addClass('hover');
            if($el.position().top + $el.height() > $dropdown.height()){
              $dropdown.scrollTop($dropdown.scrollTop() + ($el.position().top + $el.height() - $dropdown.height()));
            }
          }
          break;
        default:

          break;
      };
    },

    onSearchKeyUp: function(evt){
      switch(evt.which){
        // Enter
        case 13:
          if(this.hoverIdx !== -1){
            var node = this.searchResults[this.hoverIdx];
            if(this.options.minDepth === false){
              this.$el.find('input[type="text"]').val('');
              this.selectNode(node);
              this.hideSearchResults(true);
            }else if(this.options.minDepth <= node.depth){
              this.$el.find('input[type="text"]').val('');
              this.selectNode(node);
              this.hideSearchResults(true);
            }
          }
          break;
        // Esc
        case 27:
          this.hideSearchResults(false);
          this.$el.find('input[type="text"]').val('');
          break;
        // Up arrow
        case 38:
        // Down arrow
        case 40:
          break;
        default:
          this.hoverIdx = 0;
          if(this.searchTimer){
            clearTimeout(this.searchTimer);
          }
          this.searchTimer = setTimeout($.proxy(this.performSearch, this), this.options.searchDelay);
          break;
      };
    },

    selectNode: function(node){
      this.renderSelection();
      this.updateProxySelection();
    },

    onSearchBlur: function(evt){
      if(!this.dropdownHasMouse){
        this.hideSearchResults(true);
      }
    },

    onResultClick: function(evt){
      evt.preventDefault();
      this.selectNode(this.searchResults[$(evt.currentTarget).parent().index()]);
      this.$el.find('input[type="text"]').val("");
      this.hideSearchResults(evt);
    },

    renderControl: function(){
      // Abstract
    },

    renderSelection: function(){
      // Abstract
    },

    renderResults: function(results, search){
      var $list = this.$el.find('ul.dropdown-menu'),
          $after = $list.prev(),
          $item,
          length = results.length,
          i;
      // Detach the list from the DOM so we don't cause a ton of reflows
      $list.detach();
      $list.empty();

      if(length === 0){
        $item = $('<li class="dropdown-header"> No results found for: ' + search + '</li>');
        $list.append($item);
      }else{
        for(i = 0; i < length; i++){
          $item = this.renderResult(results[i], i);
          $list.append($item);
        }
      }
      // Re-insert the list
      $list.insertAfter($after);
    },

    renderResult: function(result, idx){
      var $item,
          path = this.nodeTree.getNodePath(result),
          parts = [];
          length = path.length;
      for(i = 0; i < length; i++){
        if(i == length - 1){
          parts.push('<strong>' + path[i] + '</strong>');
        }else{
          parts.push('<em>' + path[i] + '</em>')
        }
      }

      $item = $('<li><a>' + parts.join(' ') + '</a></li>');
      if(idx === this.hoverIdx){
        $item.find('a').addClass('hover');
      }
      if(this.options.minDepth !== false){
        if(result.depth < this.options.minDepth){
          $item.addClass('disabled');
        }
      }
      return $item;
    },

    showSearchResults: function(){
      var $dropdown = this.$el.find('ul.dropdown-menu');
      $dropdown.show();
      $dropdown.scrollTop(0);
    },

    hideSearchResults: function(shouldBlur){
      this.$el.find('ul.dropdown-menu').hide();
    },

    updateProxySelection: function(){
      var length = this.selection.length,
          valueKey = this.options.valueKey,
          i, item;
      this.$proxyEl.find('option').removeAttr('selected');
      for(i = 0; i < length; i++){
        item = this.selection[i];
        this.$proxyEl.find('option[value="' + item[valueKey] + '"]').attr('selected', 'selected');
      }
    },

    populateProxy: function(){
      var nodes = this.nodeTree.nodes,
          length = nodes.length,
          valueKey = this.options.valueKey,
          i, item, $item;
      $item = $('<option value=""></option>');
      this.$proxyEl.append($item);
      for(i = 0; i < length; i++){
        item = nodes[i];
        $item = $('<option value="' + item[valueKey] + '">' + item.name + '</option>');
        this.$proxyEl.append($item);
      }
    },

    getNodesFromProxy: function(){
      var nodes = [];
      this.$proxyEl.find('option').each(function(){
        nodes.push({
          name: $(this).html(),
          id: parseInt(this.value, 10),
          parentId: $(this).data('parent'),
          selected: $(this).attr('selected')
        });
      });
      return nodes;
    },

    getSelectionFromProxy: function(){
      var selected = [],
          nodeTree = this.nodeTree,
          node;
      this.$proxyEl.find('option:selected').each(function(){
        node = nodeTree.findById(parseInt($(this).val(),10));
        if(node){
          selected.push(node);
        }
      });
      return selected;

    },

    performSearch: function(){
      var search = this.$el.find('input[type="text"]').val(),
          searchThreshold = this.options.searchThreshold || 1;
      if(!this.hasData && this.options.delayLoad && this.options.dataUrl){
        this.loadXHRData(this.options.dataUrl, true);
      }else if(search && search.length >= searchThreshold){
        this.searchResults = this.nodeTree.search(search);
        this.renderResults(this.searchResults, search);
        this.showSearchResults();
      }else{
        this.hideSearchResults();
      }
    }
  });

  // This 'class' handles rendering a single select
  var TreeSelectSingle = function($el, options){
    TreeSelect.call(this, $el, options);
  };

  $.extend(TreeSelectSingle.prototype, TreeSelect.prototype, {

    renderControl: function(){
      // Render the 'button'
      var $wrapper = $('<div/>'),
          $button = $('<div/>'),
          $caret = $('<span/>'),
          $input = $('<input type="text"/>'),
          $title = $('<span/>'),
          $dropdown = $('<ul/>');

      $wrapper.addClass('dropdown form-inline');
      $button.addClass('btn btn-default');
      $title.addClass('btn-title');
      $caret.addClass('caret');
      $input.addClass('form-control input-sm');
      $input.attr('placeholder', this.options.searchPlaceholder);
      $input.hide();
      $button.append($input);
      $button.append($title);
      $button.append($caret);
      $wrapper.append($button);
      $dropdown.addClass('dropdown-menu');
      $wrapper.append($dropdown);

      this.$el.append($wrapper);
    },

    bindEvents: function(){
      TreeSelect.prototype.bindEvents.call(this);
      this.$el.on('click', '.btn', $.proxy(this.selectButtonClick, this));
      this.$el.on('click', '.glyphicon-remove', $.proxy(this.clearButtonClick, this));
    },

    clearButtonClick: function(evt){
      evt.preventDefault();
      evt.stopPropagation();
      this.selectNode(null);
    },

    selectButtonClick: function(evt){
      evt.preventDefault();
      this.$el.find('input').show().focus();
      this.$el.find('.btn-title').hide();
    },

    onSearchBlur: function(evt){
      // Call the parent class's handler as well
      TreeSelect.prototype.onSearchBlur.call(this, evt);
      if(!this.dropdownHasMouse){
        this.$el.find('input[type="text"]').hide();
        this.$el.find('.btn-title').show();
      }
    },

    selectNode: function(node){
      if(node){
        this.selection = [node];
      }else{
        this.selection = [];
      }
      TreeSelect.prototype.selectNode.call(this, node);
    },

    hideSearchResults: function(shouldBlur){
      TreeSelect.prototype.hideSearchResults.call(this, shouldBlur);
      if(shouldBlur){
        this.$el.find('input[type="text"]').hide();
        this.$el.find('.btn-title').show();
      }
    },

    renderSelection: function(){
      var $btnTitle = this.$el.find('.btn-title');
      if(this.selection.length > 0){
        $btnTitle.html(this.selection[0].name);
        if(this.options.allowSingleDeselect){
          $btnTitle.append($('<span/>').addClass('glyphicon glyphicon-remove pull-right'));
        }
        $btnTitle.attr('title', unescape(this.nodeTree.getNodePath(this.selection[0]).join(' / ')));
      }else{
        $btnTitle.html('');
        $btnTitle.attr('title', '');
      }
    }
  });

  // This 'class' handles rendering a multiple select
  var TreeSelectMulti = function($el, options){
    TreeSelect.call(this, $el, options);
    $el.attr('multiple','multiple');
    this.$el.addClass('multiple');
  };

  $.extend(TreeSelectMulti.prototype, TreeSelect.prototype, {

    bindEvents: function(){
      TreeSelect.prototype.bindEvents.call(this);
      this.$el.on('click', '.remove-btn', $.proxy(this.removeSelectionClick, this));
    },

    removeSelectionClick: function(evt){
      evt.preventDefault();
      this.deselectNode($(evt.currentTarget).data('node'));
    },

    renderControl: function(){
      var $wrapper = $('<ul/>'),
          $input = $('<input type="text"/>'),
          $item = $('<li/>'),
          $dropdown = $('<ul/>'),
          $container = $('<div/>');
      $container.addClass('dropdown');
      $container.append($input);
      $container.append($dropdown);
      $item.addClass('list-group-item');
      $item.append($container);
      $wrapper.addClass('list-group');
      $wrapper.append($item);
      $input.addClass('form-control input-sm');
      $input.attr('placeholder', this.options.searchPlaceholder);
      $dropdown.addClass('dropdown-menu');
      this.$el.append($wrapper);
    },

    selectNode: function(node){
      if(node){
        if(this.selection.indexOf(node) === -1){
          this.selection.push(node);
        }
      }
      TreeSelect.prototype.selectNode.call(this, node);
    },

    deselectNode: function(node){
      var idx = this.selection.indexOf(node);
      if(idx !== -1){
        this.selection.splice(idx, 1);
      }
      this.updateProxySelection();
      this.renderSelection();
    },

    renderSelection: function(){
      var $list = this.$el.find('ul.list-group'),
          length = this.selection.length,
          i;
      this.$el.find('li.list-group-item:not(:first)').remove();
      for(i = 0; i < length; i++){
        $list.append(this.renderSelectedItem(this.selection[i]));
      }
    },

    renderSelectedItem: function(item){
      var $item = $('<li/>'),
          $removeBtn = $('<button/>');
      $item.addClass('list-group-item');
      $item.html(item.name);
      $item.attr('title', unescape(this.nodeTree.getNodePath(item).join(' / ')));
      $removeBtn.addClass('btn btn-danger btn-xs pull-right remove-btn');
      $removeBtn.append('<i class="glyphicon glyphicon-remove"/>');

      $item.append($removeBtn);
      $removeBtn.data('node', item);
      return $item;
    }
  });

  var defaults = {
    searchThreshold: 2,
    searchDelay: 250,
    delayLoad: false,
    multiSelect: false,
    searchPlaceholder: 'search',
    valueKey: 'id',
    nameKey: 'name',
    minDepth: false,
    allowSingleDeselect: false,
    transformData: function(data){
      return data;
    }
  };

  $.fn.treeSelect = function(options){
    var settings = $.extend({}, defaults, options);

    return this.each(function(){
      if(this.selectView){
        // Remove the old component
        this.selectView.remove();
      }
      if(settings.multiSelect){
        $(this).attr('multiple','multiple');
        this.selectView = new TreeSelectMulti($(this), settings);
      }else{
        $(this).removeAttr('multiple');
        this.selectView = new TreeSelectSingle($(this), settings);
      }
    });
  };

  // Export 'classes'
  namespace.NodeTree = NodeTree;
  namespace.TreeSelect = TreeSelect;
  namespace.TreeSelectSingle = TreeSelectSingle;
  namespace.TreeSelectMulti = TreeSelectMulti;

}(jQuery, window));
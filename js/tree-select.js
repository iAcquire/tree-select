/**
 * Created by jason on 12/18/13.
 */
/*globals jQuery */
(function($, namespace){

  // Tree representation 'class' for our data structure.
  var NodeTree = function(options){
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
          regex = new RegExp(search,'i');

      for(i = 0; i < length; i++){
        node = this.nodes[i];
        if(node[this.searchKey] && node[this.searchKey].match(regex)){
          results.push(node);
        }
      }
      return results;
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
        parent: null
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
    this.$proxyEl = $el;
    this.$proxyEl.hide();
    this.options = options;
    this.dropdownHasMouse = false;
    this.hoverIdx = false;
    this.nodeTree = new NodeTree(options);
    this.selection = [];
    this.searchResults = [];

    if(options.data){
      this.nodeTree.build(options.data);
      this.populateProxy();
    }else if(options.dataUrl){

    }else{
      this.nodeTree.build(this.getNodesFromProxy());
      this.updateSelectionFromProxy();
    }

    this.render();
    this.bindEvents();
  };

  $.extend(TreeSelect.prototype, {

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
      this.$el.on('click', '.dropdown-menu > li > a', $.proxy(this.onResultClick, this));
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
            this.$el.find('input[type="text"]').val('');
            this.selectNode(this.searchResults[this.hoverIdx]);
            this.hideSearchResults(true);
            this.renderSelection();
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
          this.performSearch();
          break;
      };
    },

    onSearchBlur: function(evt){
      if(!this.dropdownHasMouse){
        this.hideSearchResults(true);
      }
    },

    onResultClick: function(evt){
      evt.preventDefault();
      this.selectNode($(evt.currentTarget).data('node'));
      this.updateProxySelection();
      this.$el.find('input[type="text"]').val("");
      this.hideSearchResults(evt);
      this.renderSelection();
    },

    renderControl: function(){
      // Abstract
    },

    renderSelection: function(){
      // Abstract
    },

    renderResults: function(results, search){
      var $list = $('ul.dropdown-menu',this.$el),
          $item,
          length = results.length,
          i;
      $list.find('li').remove();
      if(length === 0){
        $item = $('<li/>');
        $item.addClass('dropdown-header');
        $item.html('No results found for: ' + search);
        $list.append($item);
      }else{
        for(i = 0; i < length; i++){
          $item = this.renderResult(results[i]);
          if(i === this.hoverIdx){
            $item.find('a').addClass('hover');
          }
          $list.append($item);
        }
      }
    },

    renderResult: function(result){
      var $item = $('<li/>'),
          $link = $('<a/>'),
          $part,
          path = this.nodeTree.getNodePath(result),
          length = path.length,
          i;
      for(i = 0; i < length - 1; i++){
        $part = $('<em/>');
        $part.html(path[i]);
        $link.append($part);
      }
      $part = $('<strong/>');
      $part.html(path[length -1]);
      $link.append($part);
      $item.append($link);
      $link.data('node', result);
      return $item;
    },

    showSearchResults: function(){
      this.$el.find('ul.dropdown-menu').show();
    },

    hideSearchResults: function(shouldBlur){
      this.$el.find('ul.dropdown-menu').hide();
    },

    updateProxySelection: function(){
      var length = this.selection.length,
          i, item;
      this.$proxyEl.find('option').removeAttr('selected');
      for(i = 0; i < length; i++){
        item = this.selection[i];
        this.$proxyEl.find('option[value="' + item.id + '"]').attr('selected', 'selected');
      }
    },

    populateProxy: function(){
      var nodes = this.nodeTree.nodes,
          length = nodes.length,
          i, item, $item;
      for(i = 0; i < length; i++){
        item = nodes[i];
        $item = $('<option/>');
        $item.attr('value', item.id);
        $item.html(item.name);
        this.$proxyEl.append($item);
      }
    },

    getNodesFromProxy: function(){
      var nodes = [],
          node;
      this.$proxyEl.find('option').each(function(){
        nodes.push({
          name: $(this).html(),
          id: parseInt($(this).attr('value'), 10),
          parentId: $(this).data('parent'),
          selected: $(this).attr('selected')
        });
      });
      return nodes;
    },

    updateSelectionFromProxy: function(){

    },

    performSearch: function(){
      var search = this.$el.find('input[type="text"]').val();
      if(search){
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
          $input = $('<input/>'),
          $title = $('<span/>'),
          $dropdown = $('<ul/>');

      $wrapper.addClass('dropdown form-inline');
      $button.addClass('btn btn-default');
      $title.addClass('btn-title');
      $caret.addClass('caret');
      $input.addClass('form-control input-sm');
      $input.attr('type','text');
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
    },

    selectButtonClick: function(evt){
      evt.preventDefault();
      $('input', this.$el).show().focus();
      $('.btn-title', this.$el).hide();
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
    },

    hideSearchResults: function(shouldBlur){
      TreeSelect.prototype.hideSearchResults.call(this, shouldBlur);
      if(shouldBlur){
        this.$el.find('input[type="text"]').hide();
        this.$el.find('.btn-title').show();
      }
    },

    renderSelection: function(){
      this.$el.find('.btn-title').html(this.selection[0].name);
    }
  });

  // This 'class' handles rendering a multiple select
  var TreeSelectMulti = function($el, options){
    TreeSelect.call(this, $el, options);
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
          $input = $('<input/>'),
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
      $input.attr('type','text');
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
    },

    deselectNode: function(node){
      var idx = this.selection.indexOf(node);
      if(idx !== -1){
        this.selection.splice(idx, 1);
      }
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
      $removeBtn.addClass('btn btn-danger btn-xs pull-right remove-btn');
      $removeBtn.append('<i class="glyphicon glyphicon-remove"/>');

      $item.append($removeBtn);
      $removeBtn.data('node', item);
      return $item;
    }
  });

  var defaults = {
    multiSelect: false,
    searchPlaceholder: 'search',
    transformData: function(data){
      return data;
    }
  };

  $.fn.treeSelect = function(options){
    var settings = $.extend({}, defaults, options);

    return this.each(function(){
      // this.nodeTreeView = new NodeTreeView($(this), settings);
      if(settings.multiSelect){
        this.selectView = new TreeSelectMulti($(this), settings);
      }else{
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
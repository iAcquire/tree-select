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

  var NodeTreeView = function($el, options){
    this.nodeTree = new NodeTree(options);

    this.$proxyEl = $el;
    this.options = options || {};
    this.$proxyEl.hide();
    this.selection = [];
    this.dropDownHasMouse = false;
    this.hoverIdx = -1;
    this.searchResults = [];

    if(options.data){
      this.nodeTree.build(options.data);
      this.populateProxyEl();
    }else if(options.dataUrl){

    }else{

    }

    this.render();
    this.bindEvents();
  };

  NodeTreeView.prototype.populateProxyEl = function(){
    this.$proxyEl.find('option').remove();
    var i,
        length = this.nodeTree.nodes.length,
        item, $item;
    for(i = 0; i < length; i++){
      item = this.nodeTree.nodes[i];
      $item = $('<option/>');
      $item.attr('value', item.id);
      this.$proxyEl.append($item);
    }
  };

  NodeTreeView.prototype.bindEvents = function(){
    this.$input.on('keyup', $.proxy(this.onInputKeyUp, this));
    this.$input.on('keydown', $.proxy(this.onInputKeyDown, this));
    this.$input.on('blur', $.proxy(this.onInputBlur, this));
    this.$dropdown.on('click', 'a', $.proxy(this.onResultClick, this));
    this.$container.on('click', 'button.remove-btn', $.proxy(this.onRemoveClick,this));
    this.$dropdown.on('mouseover', $.proxy(this.onDropdownMouseOver, this));
    this.$dropdown.on('mouseout', $.proxy(this.onDropdownMouseOut, this));
    this.$dropdown.on('mouseover', 'a', $.proxy(this.onResultHover, this));
  };


  NodeTreeView.prototype.render = function(){
    this.$container = $('<div/>');
    this.$container.addClass('tree-select');
    this.renderDropdown();
    if(this.options.multiSelect){
      this.renderMultiSelect();
    }else{
      this.renderSingleSelect();
    }
    this.$container.insertAfter(this.$proxyEl);
  };

  NodeTreeView.prototype.renderMultiSelect = function(){
    var $container = $('<ul/>'),
        $inputContainer = $('<li/>');

    $container.addClass('list-group');
    $inputContainer.addClass('list-group-item');
    $inputContainer.append('<div class="dropdown"></div>');
    this.$input = $('<input/>');
    this.$input.addClass('form-control input-sm');
    this.$input.attr('placeholder', 'search');
    this.$input.attr('type', 'text');
    $inputContainer.find('.dropdown').append(this.$input);
    $inputContainer.find('.dropdown').append(this.$dropdown);
    $container.append($inputContainer);
    this.$container.append($container);
    this.$container.addClass('multi-select');
  };

  NodeTreeView.prototype.renderDropdown = function(){
    this.$dropdown = $('<ul/>');
    this.$dropdown.addClass('dropdown-menu');
  };

  NodeTreeView.prototype.renderSingleSelect = function(){
    var $container = $('<div/>');
    $container.addClass('dropdown form-inline');

    this.$input = $('<input/>');
    this.$input.addClass('form-control input-sm');
    this.$input.attr('placeholder', 'search');
    this.$input.attr('type', 'text');
    this.$input.hide();
    this.$button = $('<div/>');
    this.$button.append(this.$input);
    this.$button.append('<span class="btn-title"></span>');
    this.$button.append('<span class="caret"></span>');
    this.$button.addClass('btn btn-default');
    this.$button.on('click', $.proxy(this.showInput, this));
    $container.append(this.$button);
    $container.append(this.$dropdown);
    this.$container.append($container);
  };

  NodeTreeView.prototype.showInput = function(evt){
    this.$input.show();
    this.$input.focus();
    this.$button.find('.btn-title').hide();
  };

  NodeTreeView.prototype.onResultClick = function(evt){
    evt.preventDefault();
    this.selectNode($(evt.currentTarget).data('node'));
    this.$dropdown.hide();
  };

  NodeTreeView.prototype.onRemoveClick = function(evt){
    evt.preventDefault();
    this.deselectNode($(evt.currentTarget).data('node'));
  };

  NodeTreeView.prototype.onDropdownMouseOver = function(evt){
    this.dropDownHasMouse = true;
  };

  NodeTreeView.prototype.onDropdownMouseOut = function(evt){
    this.dropDownHasMouse = false;
  };

  NodeTreeView.prototype.onInputFocus = function(evt){
    var search = this.$input.val();
    if(search){
      this.$dropdown.show();
    }
  };

  NodeTreeView.prototype.onInputBlur = function(evt){
    if(!this.dropDownHasMouse){
      this.$dropdown.hide();
      if(!this.options.multiSelect){
        this.$input.hide();
        this.$button.find('.btn-title').show();
      }
    }
  };

  NodeTreeView.prototype.onResultHover = function(evt){
    this.$dropdown.find('li > a').removeClass('hover');
    this.hoverIdx = $(evt.currentTarget).parent().index();
  };

  NodeTreeView.prototype.onInputKeyDown = function(evt){
    var $el;
    switch(evt.which){
      // Up arrow
      case 38:
        evt.preventDefault();
        if(this.hoverIdx > 0){
          this.hoverIdx -= 1;
          this.$dropdown.find('li > a.hover').removeClass('hover');
          $el = this.$dropdown.find('li:nth-child(' + (this.hoverIdx + 1) +') a');
          $el.addClass('hover');
          if($el.position().top < 0){
            this.$dropdown.scrollTop(this.$dropdown.scrollTop() + $el.position().top);
          }
        }
        break;
      // Down arrow
      case 40:
        evt.preventDefault();
        if(this.hoverIdx < this.searchResults.length - 1){
          this.hoverIdx += 1;
          this.$dropdown.find('li > a.hover').removeClass('hover');
          $el = this.$dropdown.find('li:nth-child(' + (this.hoverIdx + 1) +') a');
          $el.addClass('hover');
          if($el.position().top + $el.height() > this.$dropdown.height()){
            this.$dropdown.scrollTop(this.$dropdown.scrollTop() + ($el.position().top + $el.height() - this.$dropdown.height()));
          }
        }
        break;
      default:

        break;
    };
  };

  NodeTreeView.prototype.onInputKeyUp = function(evt){
    switch(evt.which){
      // Enter
      case 13:
        if(this.hoverIdx !== -1){
          this.selectNode(this.searchResults[this.hoverIdx]);
        }
        break;
      // Esc
      case 27:
        this.$input.val("");
        this.$dropdown.hide();
        break;
      // Up arrow
      case 38:
      // Down arrow
      case 40:
        break;
      default:
        this.performSearch();
        break;
    };
  };

  NodeTreeView.prototype.performSearch = function(){
    var search = this.$input.val();
    this.hoverIdx = -1;
    if(search){
      this.searchResults = this.nodeTree.search(search);
      this.renderResults(this.searchResults);
      this.$dropdown.show();
    }else{
      this.$dropdown.hide();
    }
  };

  NodeTreeView.prototype.renderResults = function(results){
    this.$dropdown.html('');
    var i = 0,
        length = results.length;
    if(length > 0){
      for(i = 0; i < length; i++){
        this.renderResult(results[i]);
      }
    }else{
      // Should render a no results message here
      this.renderEmptyResults();
    }
  };

  NodeTreeView.prototype.renderEmptyResults = function(){
    this.$dropdown.html('<li>No results matching: "' + this.$input.val() + '"</li>');
  };

  NodeTreeView.prototype.renderResult = function(result){
    var i,
        path = this.nodeTree.getNodePath(result),
        name = path.pop(),
        $item = $('<li></li>'),
        $link = $('<a></a>'),
        $pathComponent;

    for(i = 0; i < path.length; i++){
      $pathComponent = $('<em></em>');
      $pathComponent.html(path[i]);
      $link.append($pathComponent);
    }
    $pathComponent = $('<strong></strong>');
    $pathComponent.html(name);
    $link.data('node', result);
    $link.append($pathComponent);
    $item.append($link);

    this.$dropdown.append($item);
  };

  NodeTreeView.prototype.selectNode = function(node){
    if(this.options.multiSelect){
      if(this.selection.indexOf(node) === -1){
        this.selection.push(node);
      }
    }else{
      this.selection = [node];
      this.$input.hide();
    }
    this.$input.val('');
    this.$dropdown.hide();
    this.renderSelection();
  };

  NodeTreeView.prototype.deselectNode = function(node){
    var idx = this.selection.indexOf(node);
    if(idx !== -1){
      this.selection.splice(idx, 1);
    }
    this.renderSelection();
  };

  NodeTreeView.prototype.renderSelection = function(){
    var i,
        length = this.selection.length,
        $container,
        $btn,
        item,
        $item;
    if(this.options.multiSelect){
      $container = this.$container.find('ul.list-group');
      this.$container.find('li.selected-item').remove();

      for(i = 0; i < length; i++){
        item = this.selection[i];
        $item = $('<li></li>');
        $btn = $('<button class="btn btn-xs btn-danger pull-right remove-btn"><i class="glyphicon glyphicon-remove"></i></button>');
        $item.addClass('list-group-item');
        $item.addClass('selected-item');
        $item.html(item.name);
        $item.append($btn);
        $btn.data('node', item);
        this.$container.find('ul.list-group').append($item);

      }
    }else{
      this.$button.find('.btn-title').html(this.selection[0].name).show();
    }
    this.$proxyEl.find('option').removeAttr('selected');
    for(i = 0; i < length; i++){
      item = this.selection[i];
      this.$proxyEl.find('option[value="' + item.id + '"]').attr('selected', 'selected');
    }
  };

  NodeTreeView.prototype.renderBrowse = function(){

  };

  var NodeTreeComponent = function(el, options){
    this.$proxyEl = el;
    this.options = $.extend({}, options);
    this.init();
  };

  $.extend(NodeTreeComponent.prototype, {

    init: function(){
      // Create the container
      this.$container = $('<div/>');
      this.$container.addClass('tree-select');
      // Create the dropdown container
      this.$dropdown = $('<ul/>');
      this.$dropdown.addClass('dropdown-menu');

      this.renderControl();
    },

    // Render the 'control'
    renderControl: function(){
      if(this.options.multiSelect){

      }else{
        this._renderSingleSelect();
      }
      this.$container.insertAfter(this.$proxyEl);
    },

    _renderSingleSelect: function(){
      var input = $('<input/>'),
          button = $('<div/>'),
          wrapper = $('<div/>');
      wrapper.addClass('dropdown form-inline');
      input.addClass('form-control input-sm');
      button.addClass('btn btn-default');
      button.append('<span class="btn-title"/>');
      button.append('<span class="caret"/>');
      button.append(input);
      wrapper.append(button);
      wrapper.append(this.$dropdown);
      this.$container.append(wrapper);
      this.hideSearch();
    },

    _renderMultiSelect: function(){

    },

    // Render selected item(s)
    renderSelection: function(){

    },

    // Render the dropdown
    renderDropdown: function(){

    },

    // Show the dropdown
    showDropdown: function(){

    },

    // Hide the dropdown
    hideDropdown: function(){

    },

    showSearch: function(){

    },

    hideSearch: function(){
      this.$container.find('input').hide();
    },

    // Select an item
    selectItem: function(item){

    },

    updateSelect: function(){

    },

    updateFromSelect: function(){

    }

    // Events....


  });

  var defaults = {
    multiSelect: false,
    transformData: function(data){
      return data;
    }
  };

  $.fn.treeSelect = function(options){
    var settings = $.extend({}, defaults, options);

    return this.each(function(){
      this.nodeTreeView = new NodeTreeView($(this), settings);
      // this.nodeTreeCompoenent = new NodeTreeComponent(this, settings);
    });
  };


  namespace.NodeTree = NodeTree;
  namespace.NodeTreeView = NodeTreeView;

}(jQuery, window));
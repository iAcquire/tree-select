/**
 * Created by jason on 1/6/14.
 */
/*globals equal, test, module, strictEqual, expect, ok, notEqual */
module("NodeTree", {
  setup: function(){
    this.nodes = [
      {id: 1, parentId: 0, name: 'parent 1'},
      {id: 2, parentId: 1, name: 'child 1'},
      {id: 3, parentId: 1, name: 'child 2'},
      {id: 4, parentId: 0, name: 'parent 2'},
      {id: 5, parentId: 4, name: 'child 3'},
      {id: 6, parentId: 5, name: 'child 4'},
      {id: 7, parentId: 99, name: 'orphan 1'}
    ];
    this.tree = new NodeTree();
  },
  teardown: function(){

  }
});

test("Build", function(){

  function scanTree(id, node){
    var found = false;
    if(node.id === id){
      found = true;
    }else{
      for(var i = 0; i < node.children.length; i++){
        found = scanTree(id, node.children[0]);
        if(found){
          break;
        }
      }
    }
    return found;
  }

  var tree = this.tree;

  tree.build(this.nodes);
  equal(tree.root.children.length, 2, "Root node should have 2 children");
  equal(tree.root.children[0].name, 'parent 1', "First node is correct");
  equal(tree.root.children[1].name, 'parent 2', "Second node is correct");
  equal(tree.root.children[0].children.length, 2, "First node has 2 children");
  equal(tree.root.children[1].children.length, 1, "Second node has 1 child");
  equal(tree.root.children[0].children[0].name, 'child 1', "Child node is correct");
  equal(tree.root.children[0].children[1].name, 'child 2', "Child node is correct");
  equal(tree.root.children[1].children[0].name, 'child 3', "Child node is correct");
  equal(tree.root.children[1].children[0].children.length, 1, "Correct number of children");
  equal(tree.root.children[1].children[0].children[0].name, 'child 4', "Child node is correct");
  strictEqual(false, scanTree(7, tree.root), "Orphaned node is not present in the tree");
});

test("Search", function(){
  var tree = this.tree,
      results;
  tree.build(this.nodes);
  results = tree.search('child');
  equal(results.length, 4, 'Search for "child" finds correct number of results');
  results = tree.search('parent');
  equal(results.length, 2, 'Search for "parent" finds correct number of results');
  results = tree.search('1');
  equal(results.length, 3, 'Search for "1" finds correct number of results');
  results = tree.search('sometextthatdoesn\'t appearinthenodes');
  equal(results.length, 0, 'Search for text that isn\'t in the node list yields 0 results');
  // The following line should NOT throw an exception (testing that search regexs generated aren't bad if user inputs regex characters ie \/.? etc)
  results = tree.search("test\\?./[]{}/  ");
});

test("Find by id", function(){
  var tree = this.tree,
      result;
  tree.build(this.nodes);
  result = tree.findById(1);
  ok(result, "Found a node with id 1");
  equal(result.id, 1, "It is indeed the node with id 1");
  result = tree.findById(1000);
  equal(null, result, "Doesn't find a node with id 1000 (it's not in the tree)");
});

test("Get node path", function(){
  var tree = this.tree,
      result;
  tree.build(this.nodes);
  result = tree.getNodePath(tree.findById(6));
  equal(result.length, 3, "Path has correct number of elements");
  equal(result[0], "parent 2", "Element is correct");
  equal(result[1], "child 3", "Element is correct");
  equal(result[2], "child 4", "Element is correct");
});

test("Transform node option", function(){
  var transformCount = 0,
      tree = new NodeTree({transformData: function(node){
        transformCount++;
        return node;
      }});
  tree.build(this.nodes);
  equal(transformCount, this.nodes.length, "Each node was passed to the transformData function passed in");
});

module('TreeSelectSingle', {
  setup: function(){
    this.nodes = [
      {id: 1, parentId: 0, name: 'parent 1'},
      {id: 2, parentId: 1, name: 'child 1'},
      {id: 3, parentId: 1, name: 'child 2'},
      {id: 4, parentId: 0, name: 'parent 2'},
      {id: 5, parentId: 4, name: 'child 3'},
      {id: 6, parentId: 5, name: 'child 4'},
      {id: 7, parentId: 99, name: 'orphan 1'}
    ];
  },
  teardown: function(){
    $('#qunit-fixture > select').find('option').remove();
  }
});

test("Component rendering", function(){
  var component = new TreeSelectSingle($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'});
  equal($('div.tree-select').length, 1, "Component wrapper rendered");
  equal($('div.tree-select div.btn.btn-default').length, 1, "Button is rendered");
  equal($('div.tree-select div.btn.btn-default input').length, 1, "Input is rendered in button");
  equal($('div.tree-select div.btn.btn-default input').is(':visible'), false, "Input is not visible by default");
  equal($('div.tree-select div.btn.btn-default span.btn-title').length, 1, "Button title element is rendered");
  equal($('div.tree-select div.btn.btn-default span.caret').length, 1, "Button caret");
  equal($('div.tree-select div.dropdown').length, 1, "Dropdown container is present");
  equal($('div.tree-select div.dropdown ul.dropdown-menu').length, 1, "Dropdown menu is present");
  // Include the empty option
  equal($('#qunit-fixture > select').find('option').length, 8,"Select element has correct number of options");
});

test("Component removal", function(){
  var component = new TreeSelectSingle($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'});
  equal($('div.tree-select').length, 1, "Component rendered");
  component.remove();
  equal($('div.tree-select').length, 0, "Component Removed");
});

test("Selection", function(){
  var component = new TreeSelectSingle($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id', nameKey: 'name'});
  component.selectNode(component.nodeTree.findById(1));
  equal($('#qunit-fixture > select').val(), 1, "Selection state of select element is correct");
  console.log(component.nodeTree.findById(1))
  equal($('div.tree-select div.btn.btn-default span.btn-title').html(), "parent 1", "Button title is rendered properly");
});

test("Results", function(){
  var component = new TreeSelectSingle($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'}),
      $input = $('.tree-select input');
  $input.val('child');
  component.performSearch();
  equal($('.dropdown-menu:visible').length, 1, "Dropdown is visible");
  equal($('.dropdown-menu li').length, 4, "Correct number of results are rendered");
  $input.val('');
  component.performSearch();
  equal($('.dropdown-menu:visible').length, 0, "Dropdown is NOT visible");
  $input.val('parent');
  component.performSearch();
  equal($('.dropdown-menu:visible').length, 1, "Dropdown is visible");
  equal($('.dropdown-menu li').length, 2, "Correct number of results are rendered");
});

test("Events", function(){
  var component = new TreeSelectSingle($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id', searchDelay: 0}),
    $input = $('.tree-select input'),
    $btn = $('.tree-select .btn.btn-default');
  equal($('#qunit-fixture .tree-select input').filter(':visible').length, 0, 'Input is not visible');
  $btn.trigger('click');
  equal($('#qunit-fixture .tree-select input').filter(':visible').length, 1, 'Input is visible');
  equal($('#qunit-fixture .tree-select .dropdown-menu').filter(':visible').length, 0, 'Dropdown is not visible');
  $input.val('1');
  $input.trigger({type: 'keyup', which: 49});
  equal($('#qunit-fixture .tree-select .dropdown-menu').filter(':visible').length, 1, 'Dropdown is visible');
  equal($('#qunit-fixture .tree-select .dropdown-menu a:first').hasClass('hover'), true,'First element is "hovered"');
  $input.trigger({type: 'keydown', which: 40});
  equal($('#qunit-fixture .tree-select .dropdown-menu a:first').hasClass('hover'), false, 'First element is not "hovered"');
  equal($('#qunit-fixture .tree-select .dropdown-menu a:eq(1)').hasClass('hover'), true, 'Next element is "hovered"');
  $input.trigger({type: 'keydown', which: 38});
  equal($('#qunit-fixture .tree-select .dropdown-menu a:first').hasClass('hover'), true, 'First element is "hovered"');
  equal($('#qunit-fixture .tree-select .dropdown-menu a:eq(1)').hasClass('hover'), false, 'Next element is not "hovered"');
  $input.trigger({type: 'keyup', which: 27});
  equal($('#qunit-fixture .tree-select .dropdown-menu').filter(':visible').length, 0, 'Dropdown is not visible');

  $('#qunit-fixture .tree-select .dropdown-menu a:first').trigger('click');
  equal(component.selection.length, 1, 'Item is selected');
  equal(component.selection[0].id, 1, 'Item selected is correct');
  equal($('#qunit-fixture .tree-select .dropdown-menu').filter(':visible').length, 0, 'Dropdown is not visible');
});

module('TreeSelectMulti', {
  setup: function(){
    this.nodes = [
      {id: 1, parentId: 0, name: 'parent 1'},
      {id: 2, parentId: 1, name: 'child 1'},
      {id: 3, parentId: 1, name: 'child 2'},
      {id: 4, parentId: 0, name: 'parent 2'},
      {id: 5, parentId: 4, name: 'child 3'},
      {id: 6, parentId: 5, name: 'child 4'},
      {id: 7, parentId: 99, name: 'orphan 1'}
    ];
  },

  teardown: function(){
    //$('#qunit-fixture > select').find('option').remove();
  }
});

test("Component rendering", function(){
  var component = new TreeSelectMulti($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'});
  equal($('div.tree-select').length, 1, "Component wrapper rendered");
  equal($('div.tree-select ul.list-group').length, 1, "Component list group rendered");
  equal($('div.tree-select ul.list-group li.list-group-item').length, 1, "Input wrapper rendered");
  equal($('div.tree-select ul.list-group li.list-group-item input').length, 1, "Input rendered");
  equal($('div.tree-select ul.list-group li.list-group-item ul.dropdown-menu').length, 1, "Dropdown rendered");
});

test("Component removal", function(){
  var component = new TreeSelectMulti($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'});
  equal($('div.tree-select').length, 1, "Component rendered");
  component.remove();
  equal($('div.tree-select').length, 0, "Component Removed");
});

test("Selection", function(){
  var component = new TreeSelectMulti($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'});
  component.selectNode(component.nodeTree.findById(1));
  component.selectNode(component.nodeTree.findById(2));
  equal($('#qunit-fixture > select > option').filter(':selected').length, 2, "Number of selected items is correct");
  equal($('#qunit-fixture > select > option').filter(':selected:first').attr('value'),1, "First item is selected correctly");
  equal($('#qunit-fixture > select > option').filter(':selected:eq(1)').attr('value'),2, "Second item is selected correctly");
});

test("Results", function(){
  var component = new TreeSelectMulti($('#qunit-fixture > select'), {data: this.nodes, valueKey: 'id'}),
      $input = $('.tree-select input');
  $input.val('child');
  component.performSearch();
  equal($('.dropdown-menu:visible').length, 1, "Dropdown is visible");
  equal($('.dropdown-menu li').length, 4, "Correct number of results are rendered");
  $input.val('');
  component.performSearch();
  equal($('.dropdown-menu:visible').length, 0, "Dropdown is NOT visible");
  $input.val('parent');
  component.performSearch();
  equal($('.dropdown-menu:visible').length, 1, "Dropdown is visible");
  equal($('.dropdown-menu li').length, 2, "Correct number of results are rendered");
});

module("Plugin", {
  setup: function(){

  },
  teardown: function(){

  }
});

test("Plugin", function(){
  notEqual($.fn.treeSelect, undefined, "Plugin is exposed");
  $('#qunit-fixture > select').treeSelect();
  equal($('.tree-select').length, 1, "Plugin renders a component");
  $('#qunit-fixture > select').treeSelect({multiSelect: true});
  equal($('.tree-select.multiple').length, 1, "Plugin renders correct component");
  $('#qunit-fixture > select').treeSelect({multiSelect: false});
  equal($('.tree-select.multiple').length, 0, "Plugin renders correct component");
  equal($('.tree-select').length, 1, "Plugin renders correct component");

});
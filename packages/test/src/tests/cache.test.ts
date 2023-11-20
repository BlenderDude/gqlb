import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { b } from "../generated/test_01/b";

describe('query caching', () => {
  test('caches documents when static', () => {
    const QUERY = b.query('BasicQuery', b => [
      //
      b.viewer(b => [
        //
        b.name(),
      ])
    ])
  
    const expected = QUERY.document();
  
    assert.equal(QUERY.document(), expected);
  })
  
  test('does not cache documents when dynamic', () => {
    const QUERY = b.query('BasicQuery', b => [
      //
      b.viewer(b => [
        //
        b.name(),
      ])
    ]).dynamic()
  
    const expected = QUERY.document();
  
    assert.notEqual(QUERY.document(), expected);
  })
  
  describe('cache key', () => {
    test('utilizes cache key to determine regeneration', async (t) => {
  
      let cacheBreaker = 0;
    
      const QUERY = b.query('BasicQuery', b => [
        //
        b.viewer(b => [
          //
          b.name(),
        ])
      ]).dynamic(() => [cacheBreaker])
    
      // When the cache breaker hasn't changed, the document should be the same
      const expected = QUERY.document();
      assert.equal(QUERY.document(), expected);
    
      // After mutating the cache breaker, the document should be different
      cacheBreaker++;
      assert.notEqual(QUERY.document(), expected);
    
    })
    test('object cache keys', () => {
      let cacheBreaker = {}
      const QUERY = b.query('BasicQuery', b => [
        //
        b.viewer(b => [
          //
          b.name(),
        ])
      ]).dynamic(() => [cacheBreaker])
  
      // When the cache breaker hasn't changed, the document should be the same
      const expected = QUERY.document();
      assert.equal(QUERY.document(), expected);
  
      // After mutating the cache breaker, the document should be different
      cacheBreaker = {};
      assert.notEqual(QUERY.document(), expected);
    })
  })  
})

describe('fragment caching', () => {
  test('caches documents when static', () => {
    const FRAGMENT = b.fragment('BasicFragment', 'User', b => [
      //
      b.name(),
    ])
  
    const expected = FRAGMENT.document();
  
    assert.equal(FRAGMENT.document(), expected);
  })
  
  test('does not cache documents when dynamic', () => {
    const FRAGMENT = b.fragment('BasicFragment', 'User', b => [
      //
      b.name(),
    ]).dynamic()
  
    const expected = FRAGMENT.document();
  
    assert.notEqual(FRAGMENT.document(), expected);
  })
  
  describe('cache key', () => {
    test('utilizes cache key to determine regeneration', async (t) => {
  
      let cacheBreaker = 0;
    
      const FRAGMENT = b.fragment('BasicFragment', 'User', b => [
        //
        b.name(),
      ]).dynamic(() => [cacheBreaker])
    
      // When the cache breaker hasn't changed, the document should be the same
      const expected = FRAGMENT.document();
      assert.equal(FRAGMENT.document(), expected);
    
      // After mutating the cache breaker, the document should be different
      cacheBreaker++;
      assert.notEqual(FRAGMENT.document(), expected);
    
    })
    test('object cache keys', () => {
      let cacheBreaker = {}
      const FRAGMENT = b.fragment('BasicFragment', 'User', b => [
        //
        b.name(),
      ]).dynamic(() => [cacheBreaker])
  
      // When the cache breaker hasn't changed, the document should be the same
      const expected = FRAGMENT.document();
      assert.equal(FRAGMENT.document(), expected);
  
      // After mutating the cache breaker, the document should be different
      cacheBreaker = {};
      assert.notEqual(FRAGMENT.document(), expected);
    })
  })  
});


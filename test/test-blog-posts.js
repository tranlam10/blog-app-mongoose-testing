'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();
const expect = chai.expect;

const { BlogPost } = require('../models');
const { runServer, app, closeServer } = require('../');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure  data from one test does not stick
// around for next one
function tearDownDb() {
    return new Promise (function(resolve, reject) {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
            .then(function(result) {
                resolve(result)
            })
            .catch(function(err) {
                reject(err);
            });
    });
}

function seedData() {
    console.info("seeding blogpost data");
    const seedData = [];
    for (let i = 0; i < 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        });
    }
    return BlogPost.insertMany(seedData);
}

describe('blog posts API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    })

    describe('testing GET endpoint', function() {
        //should get back all blogposts in the database
        //should return status of 200
        //should return count of 10 blogposts
        it('should return all existing blogposts', function() {
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf(10);
                });
        });

        //blogposts should all have content for author, title, content
        it('should return posts with the right fields', function() {
            let resBlogpost;
            return chai.request(app)
                .get('/posts')
                .then(function(res) { //res.body.blogpost 
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);

                    res.body.forEach(function(post) {
                        expect(post).to.have.keys('author', 'title', 'content', 'created', 'id');
                    });
                    resBlogpost = res.body[0];
                    return BlogPost.findById(resBlogpost.id);
                })
                .then(function(blogpost) {
                    console.log(blogpost);
                    console.log(resBlogpost);
                    expect(blogpost.id).to.equal(resBlogpost.id);
                    expect(blogpost.authorName).to.equal(resBlogpost.author);
                    expect(blogpost.title).to.equal(resBlogpost.title);
                    expect(blogpost.content).to.equal(resBlogpost.content);
                });
        });

        describe('testing POST endpoint', function() {
            //test to see if created content is there
            //test to see if status is good
            //test to see if the items created are what we put into the posts
            it('should add a new blogpost', function() {
                const newPost = {
                    author: {
                        firstName: faker.name.firstName(),
                        lastName: faker.name.lastName()
                    },
                    title: faker.lorem.sentence(),
                    content: faker.lorem.text()
                }

                let _res;
                return chai.request(app)
                    .post('/posts')
                    .send(newPost)
                    .then(function(res) {
                        _res = res;
                        expect(res).to.have.status(201);
                        expect(res).to.be.json;
                        expect(res.body).to.be.a('object');
                        expect(res.body).to.have.keys('author', 'title', 'content', 'created', 'id');
                        return BlogPost.findById(res.body.id);
                    })
                    .then(function(post) {
                        expect(post.id).to.equal(_res.body.id);
                        expect(post.authorName).to.equal(_res.body.author);
                        expect(post.title).to.equal(_res.body.title);
                        expect(post.content).to.equal(_res.body.content);
                    });
            });
        });

        describe('PUT endpoint', function() {
            //get existing post from database
            //modify that post
            //prove post is corretly updated
            it('should update item correctly', function() {
                const updatedItem = {
                    title: 'Hello there',
                    content: 'Hello there, I want to be updated'
                }

                return BlogPost
                    .findOne()
                    .then(function(post) {
                        updatedItem.id = post.id;

                        return chai.request(app)
                            .put(`/posts/${post.id}`)
                            .send(updatedItem);
                    })
                    .then(function(res) {
                        expect(res).to.have.status(204);

                        return BlogPost.findById(updatedItem.id);
                    })
                    .then(function(post) {
                        expect(post.title).to.equal(updatedItem.title);
                        expect(post.content).to.equal(updatedItem.content);
                    });
            });
        });

        describe('DELETE endpoint', function() {
            //delete item
            //return status of 400
            //check to make sure its deleted
            it('should return status of 204', function() {
                let post;
                return BlogPost
                    .findOne()
                    .then(function(_post) {
                        post = _post;
                        return chai.request(app)
                            .delete(`/posts/${post.id}`)
                    })
                    .then(function(res) {
                        expect(res).to.have.status(204);
                        return BlogPost.findById(post.id);
                    })
                    .then(function(blogpost) {
                        should.not.exist(blogpost);
                    });
            });
        })
    });
});
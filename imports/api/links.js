import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'meteor/aldeed:simple-schema'

import 'meteor/aldeed:collection2/static';

export const LinksCollection = new Mongo.Collection('links', { defineMutationMethods: false });

const schema = new SimpleSchema({
})

LinksCollection.attachSchema(schema)

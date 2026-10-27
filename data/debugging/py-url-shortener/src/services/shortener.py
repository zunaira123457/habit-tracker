from models.link import Link
from utils.base62 import encode


class Shortener:
    def __init__(self):
        self.next_id = 0
        self.links = {}

    def shorten(self, url):
        link = Link(encode(self.next_id), url)
        self.next_id += 1
        self.links[link.code] = link
        return link.code

    def resolve(self, code):
        return self.links[code].url

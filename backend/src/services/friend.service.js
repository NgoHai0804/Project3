// friend.service.js - xử lý logic bạn bè và lời mời kết bạn
const Friend = require("../models/friend.model");
const User = require("../models/user.model");
const logger = require("../utils/logger");

const mongoose = require('mongoose');

// Socket.IO instance để gửi thông báo realtime
let io = null;

function setSocketInstance(socketInstance) {
  io = socketInstance;
}


// Gửi lời mời kết bạn
async function sendFriendRequest(requesterId, addresseeId) {
  try {
    if (requesterId === addresseeId)
      throw new Error("Không thể gửi lời mời cho chính mình");

    const addressee = await User.findById(addresseeId);
    if (!addressee) throw new Error("User nhận không tồn tại");


    const existing = await Friend.findOne({
      $or: [
        { requester: requesterId, addressee: addresseeId },
        { requester: addresseeId, addressee: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        throw new Error("Đã tồn tại lời mời kết bạn đang chờ xử lý");
      }

      if (existing.status === "accepted") {
        throw new Error("Hai người đã là bạn bè");
      }

      if (existing.status === "canceled" || existing.status === "removed") {
        existing.status = "pending";
        existing.updateAt = Date.now();
        await existing.save();
        await existing.populate('requester', 'nickname avatarUrl');
        logger.info(`User ${requesterId} resent friend request to ${addresseeId}`);
        if (io) {
          const requestData = {
            _id: existing._id,
            requester: {
              _id: existing.requester._id,
              nickname: existing.requester.nickname,
              avatarUrl: existing.requester.avatarUrl,
            },
            addressee: existing.addressee,
            status: existing.status,
            createdAt: existing.createdAt,
          };
          logger.info(`Emitting friend:requestReceived (resend) to ${addresseeId.toString()}`);
          io.to(addresseeId.toString()).emit("friend:requestReceived", requestData);
        } else {
          logger.warn("Socket.io instance not available, cannot emit friend request notification");
        }
        return existing;
      }
    }

    const newRequest = await Friend.create({
      requester: requesterId,
      addressee: addresseeId,
    });

    await newRequest.populate('requester', 'nickname avatarUrl');

    logger.info(`User ${requesterId} sent friend request to ${addresseeId}`);

    if (io) {
      const requestData = {
        _id: newRequest._id,
        requester: {
          _id: newRequest.requester._id,
          nickname: newRequest.requester.nickname,
          avatarUrl: newRequest.requester.avatarUrl,
        },
        addressee: newRequest.addressee,
        status: newRequest.status,
        createdAt: newRequest.createdAt,
      };
      logger.info(`Emitting friend:requestReceived to ${addresseeId.toString()}`);
      io.to(addresseeId.toString()).emit("friend:requestReceived", requestData);
    } else {
      logger.warn("Socket.io instance not available, cannot emit friend request notification");
    }
    return newRequest;
  } catch (err) {
    if (err.code === 11000) {
      throw new Error("Đã tồn tại mối quan hệ hoặc lời mời");
    }
    logger.error("sendFriendRequest error: %o", err);
    throw err;
  }
}


// Chấp nhận lời mời kết bạn
async function acceptFriendRequest(requesterId, addresseeId) {
  try {
    console.log("acceptFriendRequest:", { requesterId, addresseeId });

    const request = await Friend.findOne({
      requester: requesterId,
      addressee: addresseeId,
      status: "pending",
    });

    if (!request) {
      throw new Error("Không tìm thấy lời mời kết bạn. Chỉ người nhận lời mời mới có quyền chấp nhận.");
    }

    request.status = "accepted";
    await request.save();
    logger.info(`Friend request accepted: ${requesterId} -> ${addresseeId}`);

    if (typeof io !== "undefined" && io) {
      io.to(requesterId.toString()).emit("friend:accepted", addresseeId);
      io.to(addresseeId.toString()).emit("friend:accepted", requesterId);
    }
    return request;
  } catch (err) {
    logger.error("acceptFriendRequest error: %o", err);
    throw err;
  }
}


// Hủy hoặc từ chối lời mời kết bạn
async function cancelFriendRequest(userAId, userBId) {
  try {
    console.log("cancelFriendRequest:", userAId, userBId);
    const request = await Friend.findOne({
      $or: [
        { requester: userAId, addressee: userBId, status: "pending" },
        { requester: userBId, addressee: userAId, status: "pending" },
      ],
    });
    if (!request) throw new Error("Không tìm thấy lời mời để hủy");

    request.status = "canceled";
    await request.save();

    logger.info(`User ${userAId} canceled/declined friend request with ${userBId}`);

    return request;
  } catch (err) {
    logger.error("cancelFriendRequest error: %o", err);
    throw err;
  }
}

// Xóa bạn bè
async function removeFriend(userAId, userBId) {
  try {
    const friendRecord = await Friend.findOne({
      $or: [
        { requester: userAId, addressee: userBId, status: "accepted" },
        { requester: userBId, addressee: userAId, status: "accepted" },
      ],
    });

    if (!friendRecord) throw new Error("Không có mối quan hệ để xóa");
    friendRecord.status = "removed";
    await friendRecord.save();

    logger.info(`User ${userAId} removed friend ${userBId}`);

    return true;
  } catch (err) {
    logger.error("removeFriend error: %o", err);
    throw err;
  }
}


// Lấy danh sách bạn bè
async function getFriendsList(userId) {
  try {
    const friends = await Friend.find({
      $or: [
        { requester: userId, status: "accepted" },
        { addressee: userId, status: "accepted" },
      ],
    })
      .populate("requester", "nickname avatarUrl status")
      .populate("addressee", "nickname avatarUrl status");
    
    const result = friends.map((f) =>
      f.requester._id.toString() === userId.toString()
        ? f.addressee
        : f.requester
    );
    
    logger.info(`Fetched friends list for user ${userId}`);
    return result;
  } catch (err) {
    logger.error("getFriendsList error: %o", err);
    throw err;
  }
}

// Lấy danh sách lời mời kết bạn đang chờ
async function getPendingRequests(userId) {
  try {
    const requests = await Friend.find({
      addressee: userId,
      status: "pending",
    }).populate("requester", "nickname avatarUrl");
    
    logger.info(`Fetched pending friend requests for user ${userId}`);
    return requests;
  } catch (err) {
    logger.error("getPendingRequests error: %o", err);
    throw err;
  }
}

// Kiểm tra trạng thái quan hệ giữa 2 người
async function getRelationshipStatus(userAId, userBId) {
  try {
    const rel = await Friend.findOne({
      $or: [
        { requester: userAId, addressee: userBId },
        { requester: userBId, addressee: userAId },
      ],
    });
    
    return rel ? rel.status : "none";
  } catch (err) {
    logger.error("getRelationshipStatus error: %o", err);
    throw err;
  }
}

// Lấy thông tin chi tiết về quan hệ giữa 2 người
async function getRelationshipDetail(userAId, userBId) {
  try {
    const rel = await Friend.findOne({
      $or: [
        { requester: userAId, addressee: userBId },
        { requester: userBId, addressee: userAId },
      ],
    });
    
    if (!rel) {
      return { status: "none", isRequester: false, isAddressee: false };
    }
    
    const isRequester = rel.requester.toString() === userAId.toString();
    const isAddressee = rel.addressee.toString() === userAId.toString();
    
    return {
      status: rel.status,
      isRequester,
      isAddressee,
      requesterId: rel.requester,
      addresseeId: rel.addressee,
    };
  } catch (err) {
    logger.error("getRelationshipDetail error: %o", err);
    throw err;
  }
}

// Tìm kiếm người dùng theo nickname hoặc userID
async function searchUsers(nickname, userID, excludeUserId) {
  try {
    if (!excludeUserId) {
      logger.warn("Thiếu excludeUserId, trả về empty array");
      return [];
    }

    let query = { _id: { $ne: excludeUserId } };

    if (userID) {
      console.log("Input userID:", userID, typeof userID, userID.length);
      
      const trimmedUserID = userID.trim();
      
      try {
        const userIdObj = new mongoose.Types.ObjectId(trimmedUserID);
        if (userIdObj.toString() === excludeUserId.toString()) {
          console.log("Searching self, return empty");
          return [];
        }
        query._id = userIdObj;
        console.log("Searching by userID:", userIdObj);
      
      } catch (err) {
        console.error("ObjectId creation error:", err);
        throw new Error("userID không hợp lệ");
      }

    } else if (nickname && nickname.length > 0) {
      query.nickname = { $regex: nickname, $options: "i" };
      console.log("Searching by nickname:", nickname);
    
    } else {
      console.log("No valid search params provided");
      return [];
    }

    const users = await User.find(query).select("nickname avatarUrl status");

    // Thêm thông tin trạng thái bạn bè cho mỗi user
    let usersWithFriendStatus = [];
    if (users.length > 0) {
      usersWithFriendStatus = await Promise.all(
        users.map(async (user) => {
          const relationshipDetail = await getRelationshipDetail(excludeUserId, user._id);
          return {
            ...user.toObject(),
            friendStatus: relationshipDetail.status,
            isRequester: relationshipDetail.isRequester,
            isAddressee: relationshipDetail.isAddressee,
          };
        })
      );
    }

    const searchType = userID ? 'userID' : 'nickname';
    logger.info(`Search users by ${searchType} - Found: ${usersWithFriendStatus.length}`);
    return usersWithFriendStatus;
  } catch (err) {
    logger.error("searchUsers error: %o", err);
    throw err;
  }
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendsList,
  getPendingRequests,
  getRelationshipStatus,
  getRelationshipDetail,
  searchUsers,
  setSocketInstance,
};

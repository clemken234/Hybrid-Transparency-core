use poseidon::poseidon2::Poseidon2;

// The exact same Pair-Hash logic we wrote in Javascript!
fn hash_pair(left: Field, right: Field) -> Field {
    // We pass the 2 elements as an array, and tell it the length is 2
    Poseidon2::hash([left, right], 2)
}

fn main(
    secret: Field,
    private_license_data: Field,
    merkle_path: [Field; 20],
    leaf_index: u32,
    public_name: pub Field,
    public_merkle_root: pub Field,
) {
    // Hash strictly in pairs using stdlib Poseidon2Hasher
    let temp_hash = hash_pair(secret, private_license_data);
    let computed_leaf = hash_pair(temp_hash, public_name);

    // TESTING (Will be REMOVED in Production)
    println(f"🔥 Noir Public Name: {public_name}");
    println(f"🔥 Noir Private License Data: {private_license_data}");
    println(f"🔥 Noir Secret: {secret}");
    println(f"🔥 Noir Leaf Index: {leaf_index}");
    println(f"🔥 Noir Computed Leaf: {computed_leaf}");
    println(f"🔥 Noir Merkle Path: {merkle_path}");
    // TESTING (Will be REMOVED in Production)

    // Climb the Merkle tree
    let mut computed_root = computed_leaf;
    let mut index = leaf_index;

    for i in 0..20 {
        let sibling = merkle_path[i];
        if index % 2 == 0 {
            computed_root = hash_pair(computed_root, sibling);
        } else {
            computed_root = hash_pair(sibling, computed_root);
        }
        index = index / 2;
    }

    // TESTING (Will be REMOVED in Production)
    println(f"🔥 Noir Computed Root: {computed_root}");
    println(f"🔥 Noir Public Merkle Root: {public_merkle_root}");
    // TESTING (Will be REMOVED in Production)

    assert(computed_root == public_merkle_root);
}

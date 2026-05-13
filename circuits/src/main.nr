use std::hash::pedersen_hash;

fn main(
    // --- PRIVATE WITNESSES ---
    secret: Field,
    private_license_data: Field,
    merkle_path: [Field; 20],
    leaf_index: u32,
    // --- PUBLIC INPUTS ---
    public_name: pub Field,
    public_merkle_root: pub Field
) {
    // CONSTRAINT 1: Leaf Reconstruction
    // Hash the license and name first, then hash the secret with that result
    let computed_leaf = pedersen_hash([secret, private_license_data, public_name]);

    // TESTING (Will be REMOVED in Production)
    println(f"🔥 Noir Public Name: {public_name}");
    println(f"🔥 Noir Private License Data: {private_license_data}");
    println(f"🔥 Noir Secret: {secret}");
    println(f"🔥 Noir Leaf Index: {leaf_index}");
    println(f"🔥 Noir Computed Leaf: {computed_leaf}");
    println(f"🔥 Noir Merkle Path: {merkle_path}");
    // TESTING (Will be REMOVED in Production)

    // CONSTRAINT 2: Merkle Inclusion Proof
    let mut computed_root = computed_leaf;
    let mut index = leaf_index;

    for i in 0..20 {
        let sibling = merkle_path[i];

        if index % 2 == 0 {
            computed_root = pedersen_hash([computed_root, sibling]);
        } else {
            computed_root = pedersen_hash([sibling, computed_root]);
        }

        index = index / 2;
    }
    // TESTING (Will be REMOVED in Production)
    println(f"🔥 Noir Computed Root: {computed_root}");
    println(f"🔥 Noir Public Merkle Root: {public_merkle_root}");
    // TESTING (Will be REMOVED in Production)

    // CONSTRAINT 3: State Verification
    assert(computed_root == public_merkle_root);
}
